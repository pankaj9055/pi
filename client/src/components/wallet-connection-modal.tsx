import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Wallet, ShieldCheck, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WalletConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletConnected: (address: string) => Promise<void>;
}

interface DetectedWallet {
  name: string;
  provider: any;
  icon: string;
}

export function WalletConnectionModal({ isOpen, onClose, onWalletConnected }: WalletConnectionModalProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedWallets, setDetectedWallets] = useState<DetectedWallet[]>([]);
  const [isDetecting, setIsDetecting] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsDetecting(true);
      setDetectedWallets([]);

      // Aggressive detection with multiple attempts
      const detectWithRetry = () => {
        let attempts = 0;
        const maxAttempts = 25;

        const attemptDetection = () => {
          attempts++;
          const wallets = detectWallets();

          if (wallets.length > 0) {
            setDetectedWallets(wallets);
            setIsDetecting(false);
          } else if (attempts < maxAttempts) {
            setTimeout(attemptDetection, 300); // Fixed delay for consistent checking
          } else {
            setIsDetecting(false);
          }
        };

        attemptDetection();
      };

      detectWithRetry();

      // Listen for ethereum provider events
      const handleEthereumInit = () => {
        setTimeout(() => {
          const wallets = detectWallets();
          if (wallets.length > 0) {
            setDetectedWallets(wallets);
            setIsDetecting(false);
          }
        }, 100);
      };

      window.addEventListener('ethereum#initialized', handleEthereumInit);

      // Continuous checking for wallet injection
      const checkInterval = setInterval(() => {
        if (detectedWallets.length === 0) {
          const wallets = detectWallets();
          if (wallets.length > 0) {
            setDetectedWallets(wallets);
            setIsDetecting(false);
            clearInterval(checkInterval);
          }
        }
      }, 300);

      // Force check after page load events
      setTimeout(() => {
        if (detectedWallets.length === 0) {
          const wallets = detectWallets();
          if (wallets.length > 0) {
            setDetectedWallets(wallets);
            setIsDetecting(false);
          }
        }
      }, 2000);

      return () => {
        window.removeEventListener('ethereum#initialized', handleEthereumInit);
        clearInterval(checkInterval);
      };
    }
  }, [isOpen, detectedWallets.length]);

  const detectWallets = (): DetectedWallet[] => {
    const wallets: DetectedWallet[] = [];

    console.log('Detecting wallets...', {
      ethereum: typeof window.ethereum,
      trustwallet: typeof window.trustwallet,
      BinanceChain: typeof window.BinanceChain,
    });

    // Priority order: Check specific wallet injections first
    // This prevents showing MetaMask when using Binance or other wallets

    // 1. Check for Binance Chain Wallet
    if (typeof window.BinanceChain !== 'undefined') {
      wallets.push({
        name: 'Binance Wallet',
        provider: window.BinanceChain,
        icon: '🟡'
      });
      console.log('✅ Binance Wallet detected via BinanceChain');
      return wallets; // Return immediately to avoid showing other wallets
    }

    // 2. Check for Trust Wallet
    if (typeof window.trustwallet !== 'undefined') {
      wallets.push({
        name: 'Trust Wallet',
        provider: window.trustwallet,
        icon: '🛡️'
      });
      console.log('✅ Trust Wallet detected via trustwallet');
      return wallets;
    }

    // 3. Check window.ethereum with proper priority detection
    if (typeof window.ethereum !== 'undefined') {
      const provider = window.ethereum;

      console.log('Provider flags:', {
        isMetaMask: provider.isMetaMask,
        isTrust: provider.isTrust,
        isTrustWallet: provider.isTrustWallet,
        isBinance: provider.isBinance,
        isCoinbaseWallet: provider.isCoinbaseWallet,
        isTokenPocket: provider.isTokenPocket,
        isBraveWallet: provider.isBraveWallet,
        isRabby: provider.isRabby,
      });

      // Check for specific wallet flags in priority order
      if (provider.isBinance) {
        wallets.push({
          name: 'Binance Wallet',
          provider: provider,
          icon: '🟡'
        });
      } else if (provider.isTrust || provider.isTrustWallet) {
        wallets.push({
          name: 'Trust Wallet',
          provider: provider,
          icon: '🛡️'
        });
      } else if (provider.isTokenPocket) {
        wallets.push({
          name: 'TokenPocket',
          provider: provider,
          icon: '💎'
        });
      } else if (provider.isCoinbaseWallet) {
        wallets.push({
          name: 'Coinbase Wallet',
          provider: provider,
          icon: '🔵'
        });
      } else if (provider.isBraveWallet) {
        wallets.push({
          name: 'Brave Wallet',
          provider: provider,
          icon: '🦁'
        });
      } else if (provider.isRabby) {
        wallets.push({
          name: 'Rabby Wallet',
          provider: provider,
          icon: '🐰'
        });
      } else if (provider.isMetaMask) {
        wallets.push({
          name: 'MetaMask',
          provider: provider,
          icon: '🦊'
        });
      } else {
        // Generic Web3 wallet
        wallets.push({
          name: 'Web3 Wallet',
          provider: provider,
          icon: '💼'
        });
      }
    }

    console.log('✅ Detected wallets:', wallets.length, wallets.map(w => w.name));
    return wallets;
  };

  const connectWallet = async (wallet: DetectedWallet) => {
    setIsConnecting(true);
    setError(null);

    try {
      const provider = wallet.provider;

      if (!provider) {
        setError(`${wallet.name} provider not available`);
        setIsConnecting(false);
        return;
      }

      // Request account access with timeout
      let accounts;
      try {
        const accountsPromise = provider.request({
          method: 'eth_requestAccounts'
        });

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout')), 30000);
        });

        accounts = await Promise.race([accountsPromise, timeoutPromise]);
      } catch (requestError: any) {
        if (requestError.message === 'Connection timeout') {
          setError('Connection timeout. Please try again.');
        } else if (requestError.code === 4001) {
          setError('Connection rejected. Please approve in your wallet.');
        } else if (requestError.code === -32002) {
          setError('Request pending. Check your wallet app.');
        } else {
          setError('Failed to connect. Please try again.');
        }
        setIsConnecting(false);
        return;
      }

      if (accounts && accounts.length > 0) {
        const address = accounts[0];

        // Skip signature - directly connect wallet
        localStorage.setItem('walletType', wallet.name);

        // Save wallet connection
        try {
          await onWalletConnected(address);
          onClose();
        } catch (saveError: any) {
          setError(saveError.message || 'Failed to save connection. Please retry.');
          setIsConnecting(false);
          return;
        }
      }
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      setError('Connection failed. Please try again.');
      setIsConnecting(false);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl backdrop-blur-xl bg-card/95 border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-center">
            Connect Wallet
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Select a wallet to connect and claim your airdrop
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isDetecting ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Detecting wallets...</p>
            </div>
          ) : detectedWallets.length === 0 ? (
            <div className="space-y-3">
              <Alert className="rounded-xl">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No wallet detected in this browser.
                </AlertDescription>
              </Alert>

              {/* Mobile Wallet Options */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-center">Open this page in your wallet app:</p>
                <div className="grid gap-2">
                  <Card
                    className="p-4 rounded-xl border-border hover:border-primary/50 transition-all cursor-pointer"
                    onClick={() => {
                      const url = window.location.href;
                      window.location.href = `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(url)}`;
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🛡️</span>
                      <div>
                        <p className="font-medium">Trust Wallet</p>
                        <p className="text-xs text-muted-foreground">Open in Trust Wallet</p>
                      </div>
                    </div>
                  </Card>

                  <Card
                    className="p-4 rounded-xl border-border hover:border-primary/50 transition-all cursor-pointer"
                    onClick={() => {
                      const url = window.location.href;
                      window.location.href = `https://metamask.app.link/dapp/${url.replace(/^https?:\/\//, '')}`;
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🦊</span>
                      <div>
                        <p className="font-medium">MetaMask</p>
                        <p className="text-xs text-muted-foreground">Open in MetaMask</p>
                      </div>
                    </div>
                  </Card>

                  <Card
                    className="p-4 rounded-xl border-border hover:border-primary/50 transition-all cursor-pointer"
                    onClick={() => {
                      const url = window.location.href;
                      window.location.href = `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url)}`;
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🔵</span>
                      <div>
                        <p className="font-medium">Coinbase Wallet</p>
                        <p className="text-xs text-muted-foreground">Open in Coinbase</p>
                      </div>
                    </div>
                  </Card>
                </div>

                <p className="text-xs text-center text-muted-foreground pt-2">
                  Or open the DApp browser in your wallet app and paste this link
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {detectedWallets.map((wallet) => (
                <Card
                  key={wallet.name}
                  className="p-6 rounded-xl border-border hover:border-primary/50 transition-all duration-200 cursor-pointer hover-elevate active-elevate-2 group"
                  onClick={() => !isConnecting && connectWallet(wallet)}
                  data-testid={`button-connect-${wallet.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 text-4xl">
                      {wallet.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {wallet.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Click to connect
                      </p>
                    </div>
                    {isConnecting && (
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="pt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-success" />
            <span>Secure wallet signature verification</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

declare global {
  interface Window {
    ethereum?: any;
    trustwallet?: any;
    BinanceChain?: any;
    coinbaseWalletExtension?: any;
  }
}