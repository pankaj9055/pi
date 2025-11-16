import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Copy, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ModWalletPaymentModalProps {
  open: boolean;
  onClose: () => void;
  walletType: "Trust Wallet" | "MetaMask" | "Binance" | null;
  onVerificationSuccess: (verificationData: any) => void;
}

export function ModWalletPaymentModal({
  open,
  onClose,
  walletType,
  onVerificationSuccess,
}: ModWalletPaymentModalProps) {
  const [qrCode, setQrCode] = useState<string>("");
  const [paymentAddress, setPaymentAddress] = useState<string>("");
  const [transactionHash, setTransactionHash] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string>("");
  const { toast } = useToast();

  const requiredAmount = walletType === "Binance" ? 150 : 70;

  useEffect(() => {
    if (open) {
      fetchQRCode();
    }
  }, [open]);

  const fetchQRCode = async () => {
    try {
      const response = await fetch("/api/payment-qr");
      const data = await response.json();
      setQrCode(data.qrCode);
      setPaymentAddress(data.address);
    } catch (error) {
      console.error("Failed to fetch QR code:", error);
      toast({
        title: "Error",
        description: "Failed to load payment information",
        variant: "destructive",
      });
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(paymentAddress);
    toast({
      title: "Copied!",
      description: "Payment address copied to clipboard",
    });
  };

  const handleVerifyPayment = async () => {
    if (!transactionHash || !userEmail || !walletAddress) {
      setError("Please fill in all fields");
      return;
    }

    if (!walletType) {
      setError("Wallet type not selected");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      const response = await fetch("/api/verify-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionId: transactionHash,
          walletType,
          userEmail,
          walletAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Payment verification failed");
        return;
      }

      toast({
        title: "Payment Verified!",
        description: "Your payment has been confirmed. Please wait...",
      });

      onVerificationSuccess(data.purchase);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-purple-900/95 to-blue-900/95 backdrop-blur-xl border-purple-500/30 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
            Get Your Mod Wallet
          </DialogTitle>
          <DialogDescription className="text-gray-300 text-center">
            {walletType} Mod - Professional Edition
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <Alert className="bg-yellow-500/20 border-yellow-500/50">
            <AlertDescription className="text-yellow-200">
              <strong>Required Payment:</strong> {requiredAmount} USDT (BEP20)
              <br />
              <strong>Network:</strong> Binance Smart Chain (BEP20)
            </AlertDescription>
          </Alert>

          {qrCode && (
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <img src={qrCode} alt="Payment QR Code" className="w-48 h-48" />
              </div>

              <div className="w-full">
                <Label className="text-sm text-gray-300">Payment Address (BEP20)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={paymentAddress}
                    readOnly
                    className="bg-purple-800/30 border-purple-500/30 text-white font-mono text-sm"
                  />
                  <Button
                    onClick={copyAddress}
                    size="sm"
                    variant="outline"
                    className="border-purple-500/30 hover:bg-purple-500/20"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="wallet" className="text-sm text-gray-300">
                Your Wallet Address *
              </Label>
              <Input
                id="wallet"
                placeholder="0x..."
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="bg-purple-800/30 border-purple-500/30 text-white font-mono mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">
                The wallet address you sent the payment from
              </p>
            </div>

            <div>
              <Label htmlFor="email" className="text-sm text-gray-300">
                Your Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="bg-purple-800/30 border-purple-500/30 text-white mt-1"
              />
            </div>

            <div>
              <Label htmlFor="txHash" className="text-sm text-gray-300">
                Transaction Hash (TxID) *
              </Label>
              <Input
                id="txHash"
                placeholder="0x..."
                value={transactionHash}
                onChange={(e) => setTransactionHash(e.target.value)}
                className="bg-purple-800/30 border-purple-500/30 text-white font-mono mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">
                After sending USDT, paste your transaction hash here
              </p>
            </div>
          </div>

          {error && (
            <Alert className="bg-red-500/20 border-red-500/50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-200">{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleVerifyPayment}
            disabled={isVerifying}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-purple-900 font-bold"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying Payment...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Verify Payment
              </>
            )}
          </Button>

          <Alert className="bg-orange-500/20 border-orange-500/50">
            <AlertDescription className="text-orange-200 text-xs">
              <strong>⚠️ Important Security Notice:</strong>
              <br />
              • This mod wallet is built specifically for your device capabilities
              <br />
              • Do NOT share or leak your mod wallet APK file
              <br />
              • Sharing may result in permanent ban with no refund
              <br />• Keep your wallet file secure and private
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
}
