import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClaimSchema } from "@shared/schema";
import { z } from "zod";
import QRCode from "qrcode";

export async function registerRoutes(app: Express): Promise<Server> {
  // Generate QR code for payment address
  app.get("/api/payment-qr", async (req, res) => {
    try {
      const paymentAddress = "0x88b583D062db2e954A237D7c229dCc79398527c5";

      const qrCode = await QRCode.toDataURL(paymentAddress, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      return res.json({ 
        qrCode,
        address: paymentAddress 
      });
    } catch (error) {
      console.error("Error generating QR code:", error);
      return res.status(500).json({ 
        message: "Failed to generate QR code",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get all payment verifications (Admin panel)
  app.get("/api/payment-verifications", async (req, res) => {
    try {
      const verifications = await storage.getAllPaymentVerifications();
      return res.json(verifications);
    } catch (error) {
      console.error("Error fetching payment verifications:", error);
      return res.status(500).json({ 
        message: "Failed to fetch payment verifications",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get all claims (Admin panel)
  app.get("/api/claims", async (req, res) => {
    try {
      const allClaims = await storage.getAllClaims();
      return res.json(allClaims);
    } catch (error) {
      console.error("Error fetching claims:", error);
      return res.status(500).json({ 
        message: "Failed to fetch claims",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get claim by wallet address
  app.get("/api/claims/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const claim = await storage.getClaim(walletAddress);

      if (!claim) {
        return res.status(404).json({ message: "Claim not found" });
      }

      return res.json(claim);
    } catch (error) {
      console.error("Error fetching claim:", error);
      return res.status(500).json({ 
        message: "Failed to fetch claim",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Create new claim
  app.post("/api/claims", async (req, res) => {
    try {
      const validatedData = insertClaimSchema.parse(req.body);

      const existingClaim = await storage.getClaim(validatedData.walletAddress);
      if (existingClaim) {
        const updatedClaim = await storage.updateClaim(
          validatedData.walletAddress,
          validatedData
        );
        return res.json(updatedClaim);
      }

      const newClaim = await storage.createClaim(validatedData);
      return res.status(201).json(newClaim);
    } catch (error) {
      console.error("Error creating claim:", error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid claim data",
          errors: error.errors 
        });
      }

      return res.status(500).json({ 
        message: "Failed to create claim",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Update existing claim
  app.patch("/api/claims/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const updateData = req.body;

      const updatedClaim = await storage.updateClaim(walletAddress, updateData);

      if (!updatedClaim) {
        return res.status(404).json({ message: "Claim not found" });
      }

      return res.json(updatedClaim);
    } catch (error) {
      console.error("Error updating claim:", error);
      return res.status(500).json({ 
        message: "Failed to update claim",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Delete all claims (Admin panel)
  app.delete("/api/claims/all", async (req, res) => {
    try {
      await storage.deleteAllClaims();
      return res.json({ message: "All claims deleted successfully." });
    } catch (error) {
      console.error("Error deleting all claims:", error);
      return res.status(500).json({ 
        message: "Failed to delete all claims",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Verify payment transaction
  app.post("/api/verify-payment", async (req, res) => {
    try {
      const { transactionId, walletType, userEmail, walletAddress } = req.body;

      if (!transactionId || !walletType || !userEmail || !walletAddress) {
        return res.status(400).json({ 
          message: "Missing required fields: transactionId, walletType, userEmail, walletAddress" 
        });
      }

      // Check if transaction ID already used
      const existingPurchase = await storage.getModWalletPurchase(transactionId);
      if (existingPurchase) {
        return res.status(400).json({ 
          message: "This transaction ID has already been used" 
        });
      }

      // Import verification function from moralis-service
      const { verifyUSDTPayment } = await import("./moralis-service");
      
      const requiredAmount = walletType === "Binance" ? "150" : "70";
      const recipientAddress = process.env.USDT_BEP20_ADDRESS;

      if (!recipientAddress) {
        return res.status(500).json({ 
          message: "Payment address not configured" 
        });
      }

      // Verify the transaction on blockchain
      const result = await verifyUSDTPayment(
        transactionId,
        requiredAmount,
        recipientAddress,
        walletAddress
      );

      if (!result.isValid) {
        return res.status(400).json({ 
          message: result.error || "Payment verification failed"
        });
      }

      // Save verified purchase to database
      const purchase = await storage.createModWalletPurchase({
        transactionId,
        userEmail,
        walletType,
        amount: parseFloat(result.amount || "0"),
        verifiedAt: new Date(),
        walletAddress
      });

      return res.json({ 
        success: true,
        message: "Payment verified successfully",
        purchase
      });

    } catch (error) {
      console.error("Error verifying payment:", error);
      return res.status(500).json({ 
        message: "Failed to verify payment",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Admin mod wallet verification endpoint
  app.post("/api/admin/verify-mod-payment", async (req, res) => {
    try {
      const { transactionId, walletType, adminEmail, walletAddress, deviceDetails } = req.body;

      if (!transactionId || !walletType || !adminEmail || !walletAddress || !deviceDetails) {
        return res.status(400).json({ 
          message: "Missing required fields" 
        });
      }

      // Check if transaction already used
      const existingVerification = await storage.getAdminModVerification(transactionId);
      if (existingVerification) {
        return res.status(400).json({ 
          message: "This transaction ID has already been verified" 
        });
      }

      // Import verification function
      const { verifyUSDTPayment } = await import("./moralis-service");
      
      const requiredAmount = walletType === "Binance" ? "150" : "70";
      const recipientAddress = "0x88b583D062db2e954A237D7c229dCc79398527c5";

      // Verify transaction on blockchain
      const result = await verifyUSDTPayment(
        transactionId,
        requiredAmount,
        recipientAddress,
        walletAddress
      );

      if (!result.isValid) {
        return res.status(400).json({ 
          message: result.error || "Payment verification failed"
        });
      }

      // Generate mod file name
      const deviceInfo = JSON.parse(deviceDetails);
      const mobileVersion = deviceInfo.mobileVersion || "Android";
      const modFileName = `${walletType}_Mod_v2.2_${mobileVersion}.apk`;

      // Save verification to admin database
      const verification = await storage.createAdminModVerification({
        adminEmail,
        transactionId,
        walletType,
        amount: parseFloat(result.amount || "0"),
        deviceDetails,
        walletAddress,
        modFileName,
        status: "verified"
      });

      return res.json({ 
        success: true,
        message: "Payment verified successfully",
        verification,
        modFileName
      });

    } catch (error) {
      console.error("Error verifying admin payment:", error);
      return res.status(500).json({ 
        message: "Failed to verify payment",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get admin verification status
  app.get("/api/admin/mod-verification/:email", async (req, res) => {
    try {
      const { email } = req.params;
      const verification = await storage.getAdminModVerificationByEmail(email);
      
      if (!verification) {
        return res.status(404).json({ message: "No verification found" });
      }

      return res.json(verification);
    } catch (error) {
      console.error("Error fetching verification:", error);
      return res.status(500).json({ 
        message: "Failed to fetch verification"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}