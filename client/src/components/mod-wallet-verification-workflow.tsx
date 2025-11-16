import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Clock, Package, Mail, Smartphone, Shield } from "lucide-react";

interface WorkflowStage {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  estimatedTime?: string;
}

interface ModWalletVerificationWorkflowProps {
  open: boolean;
  onClose: () => void;
  verificationData: any;
  walletType: string;
}

export function ModWalletVerificationWorkflow({
  open,
  onClose,
  verificationData,
  walletType,
}: ModWalletVerificationWorkflowProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

  useEffect(() => {
    if (open) {
      collectDeviceInfo();
      startWorkflowProgression();
    }
  }, [open]);

  const collectDeviceInfo = () => {
    const info = {
      model: navigator.userAgent.match(/\(([^)]+)\)/)?.[1] || "Unknown",
      browser: navigator.userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/)?.[0] || "Unknown",
      os: navigator.platform || "Unknown",
      screen: `${screen.width}x${screen.height}`,
      mobileVersion: /Android|iPhone|iPad/.test(navigator.userAgent) 
        ? navigator.userAgent.match(/(Android|iPhone OS) [\d._]+/)?.[0] || "Mobile"
        : "Desktop",
    };
    setDeviceInfo(info);
  };

  const startWorkflowProgression = () => {
    const stages = [0, 1, 2, 3, 4];
    const delays = [3000, 7200000, 3600000, 86400000 * 10];

    setTimeout(() => setCurrentStage(1), 3000);
    setTimeout(() => setCurrentStage(2), 10000);
    setTimeout(() => setCurrentStage(3), 20000);
    setTimeout(() => setCurrentStage(4), 30000);
  };

  const workflowStages: WorkflowStage[] = [
    {
      id: 0,
      title: "Device Details Collected",
      description: `Device: ${deviceInfo?.model || "Detecting..."}\nBrowser: ${deviceInfo?.browser || "Detecting..."}\nOS: ${deviceInfo?.os || "Detecting..."}\nScreen: ${deviceInfo?.screen || "Detecting..."}`,
      icon: <Smartphone className="h-6 w-6" />,
    },
    {
      id: 1,
      title: "Developer Verification In Progress",
      description: `Verifying your ${walletType} transaction...\nDeveloper is checking payment details and device compatibility.`,
      icon: <Clock className="h-6 w-6 animate-spin" />,
      estimatedTime: "Estimated time: 2 hours",
    },
    {
      id: 2,
      title: "Verification Complete!",
      description: `Payment verified successfully!\nYour mod wallet details are being prepared...`,
      icon: <CheckCircle2 className="h-6 w-6 text-green-400" />,
    },
    {
      id: 3,
      title: "Mod Wallet Creation Started",
      description: `Building custom ${walletType} mod for your device...\nWallet Name: ${walletType}_Mod_v2.2\nAPK Name: ${walletType.toLowerCase()}_mod_v2.2_android.apk`,
      icon: <Package className="h-6 w-6" />,
      estimatedTime: "Estimated time: 10-15 days",
    },
    {
      id: 4,
      title: "Delivery Scheduled",
      description: "Your custom mod wallet will be sent to your email within 10-15 days.\n\n⚠️ IMPORTANT SECURITY WARNINGS:\n• Built for your specific device capabilities\n• DO NOT share or leak your APK file\n• Sharing = Permanent ban (NO refunds)\n• Keep your wallet file private and secure",
      icon: <Mail className="h-6 w-6" />,
    },
  ];

  const getStageProgress = () => {
    return ((currentStage + 1) / workflowStages.length) * 100;
  };

  const currentStageData = workflowStages[currentStage];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-purple-900/95 to-blue-900/95 backdrop-blur-xl border-purple-500/30 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
            Mod Wallet Creation Status
          </DialogTitle>
          <DialogDescription className="text-gray-300 text-center">
            {walletType} Mod - Professional Edition
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-300">
              <span>Progress</span>
              <span>{Math.round(getStageProgress())}%</span>
            </div>
            <Progress value={getStageProgress()} className="h-3" />
          </div>

          <div className="bg-purple-800/30 rounded-lg p-6 border border-purple-500/30 space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-700/50 rounded-full">
                {currentStageData.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-yellow-400">
                  {currentStageData.title}
                </h3>
                {currentStageData.estimatedTime && (
                  <p className="text-sm text-gray-400">{currentStageData.estimatedTime}</p>
                )}
              </div>
            </div>

            <div className="text-gray-300 whitespace-pre-line text-sm">
              {currentStageData.description}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-300">Workflow Stages:</h4>
            {workflowStages.map((stage, index) => (
              <div
                key={stage.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  index <= currentStage
                    ? "bg-green-500/20 border-green-500/30"
                    : "bg-gray-800/30 border-gray-700/30"
                } border`}
              >
                {index <= currentStage ? (
                  <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-500 flex-shrink-0" />
                )}
                <span
                  className={`text-sm ${
                    index <= currentStage ? "text-white font-medium" : "text-gray-500"
                  }`}
                >
                  {stage.title}
                </span>
              </div>
            ))}
          </div>

          {currentStage >= 4 && (
            <Alert className="bg-orange-500/20 border-orange-500/50">
              <Shield className="h-4 w-4" />
              <AlertDescription className="text-orange-200 text-sm">
                <strong>Security Reminder:</strong> Your mod wallet is customized for your device.
                Leaking or sharing it will result in immediate ban with no refund. Keep it secure!
              </AlertDescription>
            </Alert>
          )}

          {currentStage >= 3 && (
            <Button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-purple-900 font-bold"
            >
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
