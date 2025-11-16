import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Check } from "lucide-react";

interface ModWalletVersionPickerProps {
  isOpen: boolean;
  onClose: () => void;
  walletType: string;
  onVersionSelected: (version: string) => void;
}

export function ModWalletVersionPicker({ 
  isOpen, 
  onClose, 
  walletType,
  onVersionSelected 
}: ModWalletVersionPickerProps) {
  const [isPickingVersion, setIsPickingVersion] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && walletType) {
      setIsPickingVersion(true);
      setSelectedVersion(null);

      // Show "picking mod version" for 4-5 seconds
      const timer = setTimeout(() => {
        setIsPickingVersion(false);
      }, 4500); // 4.5 seconds

      return () => clearTimeout(timer);
    }
  }, [isOpen, walletType]);

  const versions = [
    { version: "2.3", label: "Version 2.3 (Latest)", isLatest: true },
    { version: "2.2", label: "Version 2.2", isLatest: false },
    { version: "2.1", label: "Version 2.1", isLatest: false },
  ];

  const handleVersionSelect = (version: string) => {
    setSelectedVersion(version);
    // Small delay before proceeding - only call onVersionSelected, not onClose
    // Parent will handle closing the modal and showing the next step
    setTimeout(() => {
      onVersionSelected(version);
    }, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl backdrop-blur-xl bg-card/95 border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-center">
            {walletType} Mod Version
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {isPickingVersion ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <Package className="w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-primary" />
              </div>
              <p className="text-lg font-semibold text-primary animate-pulse">Picking Mod Version...</p>
              <p className="text-sm text-muted-foreground">Please wait</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-center text-sm text-muted-foreground mb-4">
                Select your preferred {walletType} mod version
              </p>
              
              {versions.map((v) => (
                <Card
                  key={v.version}
                  className={`p-5 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:scale-[1.02] ${
                    selectedVersion === v.version
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleVersionSelect(v.version)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        v.isLatest ? 'bg-green-500/20 text-green-500' : 'bg-primary/20 text-primary'
                      }`}>
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{walletType}</p>
                        <p className="text-sm text-muted-foreground">{v.label}</p>
                      </div>
                    </div>
                    
                    {v.isLatest && (
                      <div className="bg-green-500/20 text-green-500 px-3 py-1 rounded-full text-xs font-semibold">
                        Latest
                      </div>
                    )}
                    
                    {selectedVersion === v.version && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                </Card>
              ))}

              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={onClose}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
