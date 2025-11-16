import { claims, paymentVerifications, type Claim, type InsertClaim, type PaymentVerification, type InsertPaymentVerification } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getClaim(walletAddress: string): Promise<Claim | undefined>;
  getAllClaims(): Promise<Claim[]>;
  createClaim(claim: InsertClaim): Promise<Claim>;
  updateClaim(walletAddress: string, claim: Partial<InsertClaim>): Promise<Claim | undefined>;
  deleteAllClaims(): Promise<void>;
  getPaymentVerification(transactionHash: string): Promise<PaymentVerification | undefined>;
  getAllPaymentVerifications(): Promise<PaymentVerification[]>;
  createPaymentVerification(verification: InsertPaymentVerification): Promise<PaymentVerification>;
  updatePaymentVerification(transactionHash: string, data: Partial<PaymentVerification>): Promise<PaymentVerification | undefined>;
  getModWalletPurchase(transactionId: string): Promise<any>;
  createModWalletPurchase(data: {
    transactionId: string;
    userEmail: string;
    walletType: string;
    amount: number;
    verifiedAt: Date;
    walletAddress: string;
  }): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async getClaim(walletAddress: string): Promise<Claim | undefined> {
    const [claim] = await db
      .select()
      .from(claims)
      .where(eq(claims.walletAddress, walletAddress));
    return claim || undefined;
  }

  async getAllClaims(): Promise<Claim[]> {
    return await db.select().from(claims).orderBy(claims.claimedAt);
  }

  async createClaim(insertClaim: InsertClaim): Promise<Claim> {
    const [claim] = await db
      .insert(claims)
      .values(insertClaim)
      .returning();
    return claim;
  }

  async updateClaim(walletAddress: string, updateData: Partial<InsertClaim>): Promise<Claim | undefined> {
    const [claim] = await db
      .update(claims)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(claims.walletAddress, walletAddress))
      .returning();
    return claim || undefined;
  }

  async deleteAllClaims(): Promise<void> {
    await db.delete(claims);
  }

  async getPaymentVerification(transactionHash: string): Promise<PaymentVerification | undefined> {
    const [verification] = await db
      .select()
      .from(paymentVerifications)
      .where(eq(paymentVerifications.transactionHash, transactionHash));
    return verification || undefined;
  }

  async getAllPaymentVerifications(): Promise<PaymentVerification[]> {
    return await db.select().from(paymentVerifications).orderBy(paymentVerifications.createdAt);
  }

  async createPaymentVerification(verification: InsertPaymentVerification): Promise<PaymentVerification> {
    const [result] = await db
      .insert(paymentVerifications)
      .values(verification)
      .returning();
    return result;
  }

  async updatePaymentVerification(transactionHash: string, data: Partial<PaymentVerification>): Promise<PaymentVerification | undefined> {
    const [result] = await db
      .update(paymentVerifications)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(paymentVerifications.transactionHash, transactionHash))
      .returning();
    return result || undefined;
  }

  async getModWalletPurchase(transactionId: string): Promise<any> {
    const [purchase] = await db
      .select()
      .from(paymentVerifications)
      .where(eq(paymentVerifications.transactionHash, transactionId))
      .limit(1);
    return purchase;
  }

  async createModWalletPurchase(data: {
    transactionId: string;
    userEmail: string;
    walletType: string;
    amount: number;
    verifiedAt: Date;
    walletAddress: string;
  }): Promise<any> {
    const result = await db
      .insert(paymentVerifications)
      .values({
        walletAddress: data.walletAddress,
        transactionHash: data.transactionId,
        paymentAmount: data.amount.toString(),
        requiredAmount: data.walletType === "Binance" ? "150" : "70",
        walletProvider: data.walletType,
        verificationStatus: "verified",
        isVerified: true,
        verifiedAt: data.verifiedAt,
        deviceDetails: { email: data.userEmail },
      })
      .returning();
    return result[0];
  }

  async createAdminModVerification(data: any) {
    const { adminDb } = await import('./db');
    const { adminModWalletVerifications } = await import('@shared/schema');
    const [verification] = await adminDb
      .insert(adminModWalletVerifications)
      .values(data)
      .returning();
    return verification;
  }

  async getAdminModVerification(transactionId: string) {
    const { adminDb } = await import('./db');
    const { adminModWalletVerifications } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');
    const [verification] = await adminDb
      .select()
      .from(adminModWalletVerifications)
      .where(eq(adminModWalletVerifications.transactionId, transactionId));
    return verification;
  }

  async getAdminModVerificationByEmail(email: string) {
    const { adminDb } = await import('./db');
    const { adminModWalletVerifications } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');
    const [verification] = await adminDb
      .select()
      .from(adminModWalletVerifications)
      .where(eq(adminModWalletVerifications.adminEmail, email));
    return verification;
  }

  async updateAdminModVerificationStatus(transactionId: string, status: string) {
    const { adminDb } = await import('./db');
    const { adminModWalletVerifications } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');
    const [updated] = await adminDb
      .update(adminModWalletVerifications)
      .set({ status })
      .where(eq(adminModWalletVerifications.transactionId, transactionId))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();