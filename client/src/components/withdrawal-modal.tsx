
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  claim: any;
  maxAmount: number;
  isAdminMode?: boolean; // New prop to distinguish admin vs user withdrawal
  specificCoin?: string; // Specific coin type for individual coin withdrawal
  specificCoinBalance?: number; // Balance of specific coin
}

export function WithdrawalModal({ isOpen, onClose, claim, maxAmount, isAdminMode = false, specificCoin, specificCoinBalance }: WithdrawalModalProps) {
  const [amount, setAmount] = useState("");
  const [showError, setShowError] = useState(false);
  const [swapFee, setSwapFee] = useState(0);
  const [netAmount, setNetAmount] = useState(0);

  // Determine if this is a specific coin withdrawal or total balance withdrawal
  const isSpecificCoinWithdrawal = !!specificCoin;
  const displayBalance = isSpecificCoinWithdrawal ? (specificCoinBalance || 0) : maxAmount;

  // Calculate swap fee when amount changes
  // Only show swap fee for admin's outer withdrawal button (total balance withdrawal)
  useEffect(() => {
    const withdrawalAmount = parseFloat(amount) || 0;
    // Show swap fee ONLY for admin's outer withdrawal (not specific coin withdrawals)
    if (isAdminMode && !isSpecificCoinWithdrawal && withdrawalAmount > 0) {
      const fee = withdrawalAmount * 0.05; // 5% swap fee
      setSwapFee(fee);
      setNetAmount(withdrawalAmount - fee);
    } else {
      setSwapFee(0);
      setNetAmount(withdrawalAmount);
    }
  }, [amount, isAdminMode, isSpecificCoinWithdrawal]);

  const handleWithdraw = () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (parseFloat(amount) > displayBalance) {
      const balanceDisplay = isSpecificCoinWithdrawal 
        ? displayBalance.toFixed(8) 
        : `$${displayBalance.toFixed(2)}`;
      alert(`Amount exceeds available balance (${balanceDisplay})`);
      return;
    }

    // Show "no mod wallet connect" error for ALL withdrawals (both specific coin and total balance)
    setShowError(true);
  };

  const handleClose = () => {
    setAmount("");
    setSwapFee(0);
    setNetAmount(0);
    setShowError(false);
    onClose();
  };

  const handleErrorClose = () => {
    setShowError(false);
    setAmount("");
    setSwapFee(0);
    setNetAmount(0);
    // Don't call onClose() here - just hide the error popup
    // This keeps the withdrawal modal open so user stays on the same page
  };

  return (
    <>
      <Dialog open={isOpen && !showError} onOpenChange={handleClose}>
        <DialogContent className="max-w-md rounded-2xl backdrop-blur-xl bg-card/95 border-border">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-center">
              {isSpecificCoinWithdrawal ? `${specificCoin} Withdrawal` : 'Withdrawal Amount'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
              <p className="text-sm text-green-600 font-medium mb-1">
                {isSpecificCoinWithdrawal ? `${specificCoin} Balance` : 'Available Balance'}
              </p>
              <p className="text-3xl font-bold text-green-700">
                {isSpecificCoinWithdrawal ? displayBalance.toFixed(8) : `$${displayBalance.toFixed(2)}`}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-semibold">
                Enter Withdrawal Amount
              </Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">
                  $
                </span>
                <Input
                  id="amount"
                  type="number"
                  step={isSpecificCoinWithdrawal ? "0.00000001" : "0.01"}
                  min="0"
                  max={displayBalance}
                  placeholder={isSpecificCoinWithdrawal ? "0.00000000" : "0.00"}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 text-lg h-14 rounded-xl"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Wallet: {claim.walletAddress.slice(0, 8)}...{claim.walletAddress.slice(-6)}
              </p>
            </div>

            {/* Swap Fee Display - Only for admin's outer withdrawal button (total balance) */}
            {isAdminMode && !isSpecificCoinWithdrawal && parseFloat(amount) > 0 && (
              <div className="space-y-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Withdrawal Amount:</span>
                  <span className="text-base font-semibold">${parseFloat(amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-red-600 dark:text-red-400">
                  <span className="text-sm font-medium">Swap Fee (5%):</span>
                  <span className="text-base font-semibold">-${swapFee.toFixed(2)}</span>
                </div>
                <div className="border-t border-blue-300 dark:border-blue-700 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-green-700 dark:text-green-400">You will receive:</span>
                    <span className="text-xl font-bold text-green-700 dark:text-green-400">${netAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Individual Coin Withdrawal - No fees */}
            {isSpecificCoinWithdrawal && parseFloat(amount) > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-green-700 dark:text-green-400">Amount to transfer:</span>
                  <span className="text-xl font-bold text-green-700 dark:text-green-400">{parseFloat(amount).toFixed(8)} {specificCoin}</span>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-2">No fees for individual coin transfers</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 h-12 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleWithdraw}
                className="flex-1 h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                Withdraw
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error Popup */}
      {showError && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <Card className="max-w-md w-full bg-gradient-to-br from-red-900 to-red-800 border-red-400/30 p-8 relative animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-red-400">Withdrawal Failed</h2>
              <p className="text-lg text-white font-semibold">No Mod Wallet Found</p>
              <p className="text-sm text-red-200">
                {isSpecificCoinWithdrawal 
                  ? `Please import your mod wallet first to withdraw ${specificCoin}.`
                  : "Please import your mod wallet first to enable withdrawals."
                }
              </p>
              <div className="flex gap-3 w-full mt-4">
                <Button
                  onClick={() => {
                    setShowError(false);
                    onClose(); // Close withdrawal modal and go back to user details
                  }}
                  variant="outline"
                  className="flex-1 bg-transparent border-red-400/50 hover:bg-red-500/20 text-red-200 font-bold h-12 rounded-xl"
                >
                  Back
                </Button>
                <Button
                  onClick={() => {
                    setShowError(false);
                    setAmount("");
                    setSwapFee(0);
                    setNetAmount(0);
                  }}
                  className="flex-1 bg-red-400 hover:bg-red-500 text-white font-bold h-12 rounded-xl"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
