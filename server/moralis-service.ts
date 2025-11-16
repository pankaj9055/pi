import { z } from "zod";
import Moralis from "moralis";

// Initialize Moralis once
let moralisInitialized = false;

const MORALIS_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjYxMWQzYTVlLTFiNzItNDE0MS05Y2M2LTQxOGJjOTM5NDg5MiIsIm9yZ0lkIjoiNDgwOTA4IiwidXNlcklkIjoiNDk0NzU1IiwidHlwZUlkIjoiMDQ5OGJmZWEtNzBkNi00Y2M0LTg3ZWUtNTliOTJlZTA5YzU1IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NjI5MzAyMjIsImV4cCI6NDkxODY5MDIyMn0.Yzs5iVgRrdHWPxw8Mwuc56D6Jzv3cFqPEwse5uW-hkU";
const MORALIS_API_BASE = "https://deep-index.moralis.io/api/v2.2";
const USDT_BEP20_ADDRESS = "0x55d398326f99059ff775485246999027b3197955";

async function initializeMoralis() {
  if (!moralisInitialized) {
    try {
      await Moralis.start({
        apiKey: MORALIS_API_KEY
      });
      moralisInitialized = true;
      console.log("Moralis initialized successfully");
    } catch (error) {
      console.error("Error initializing Moralis:", error);
      throw error;
    }
  }
}

export interface MoralisTransaction {
  hash: string;
  from_address: string;
  to_address: string;
  value: string;
  block_timestamp: string;
  block_number: string;
  token_transfers?: Array<{
    token_address: string;
    from_address: string;
    to_address: string;
    value: string;
    token_decimals: number;
    token_symbol: string;
  }>;
}

export interface TransactionVerificationResult {
  isValid: boolean;
  transaction?: MoralisTransaction;
  amount?: string;
  from?: string;
  to?: string;
  tokenSymbol?: string;
  error?: string;
}

export async function getWalletTransactions(
  walletAddress: string,
  chain: string = "bsc"
): Promise<MoralisTransaction[]> {
  if (!MORALIS_API_KEY) {
    throw new Error("MORALIS_API_KEY not configured");
  }

  const url = `${MORALIS_API_BASE}/${walletAddress}?chain=${chain}&order=DESC&limit=100`;

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "X-API-Key": MORALIS_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Moralis API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.result || [];
}

export async function getTransactionByHash(
  transactionHash: string,
  chain: string = "bsc"
): Promise<MoralisTransaction | null> {
  if (!MORALIS_API_KEY) {
    throw new Error("MORALIS_API_KEY not configured");
  }

  const url = `${MORALIS_API_BASE}/transaction/${transactionHash}?chain=${chain}`;

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "X-API-Key": MORALIS_API_KEY,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Moralis API error: ${response.statusText}`);
  }

  return await response.json();
}

export async function verifyUSDTPayment(
  transactionHash: string,
  requiredAmount: string,
  recipientAddress: string,
  senderAddress: string
): Promise<{ isValid: boolean; error?: string; amount?: string }> {
  try {
    await initializeMoralis();

    // Get transaction details from BSC
    const transaction = await Moralis.EvmApi.transaction.getTransaction({
      chain: "0x38", // BSC Mainnet
      transactionHash: transactionHash,
    });

    const txData = transaction.raw;

    // USDT BEP20 contract address on BSC
    const USDT_CONTRACT = "0x55d398326f99059fF775485246999027B3197955";

    // Verify it's a contract interaction with USDT
    if (!txData.to || txData.to.toLowerCase() !== USDT_CONTRACT.toLowerCase()) {
      return { 
        isValid: false, 
        error: "Transaction is not a USDT BEP20 transfer" 
      };
    }

    // Verify transaction is confirmed
    if (!txData.receipt_status || txData.receipt_status === "0") {
      return { 
        isValid: false, 
        error: "Transaction failed or is not confirmed" 
      };
    }

    // Decode transfer event to get recipient and amount
    const logs = txData.receipt_logs || [];
    let transferLog = null;

    for (const log of logs) {
      if (
        log.address.toLowerCase() === USDT_CONTRACT.toLowerCase() &&
        log.topic0 === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
      ) {
        transferLog = log;
        break;
      }
    }

    if (!transferLog) {
      return { 
        isValid: false, 
        error: "No USDT transfer found in transaction" 
      };
    }

    // Decode the transfer log
    const recipient = "0x" + transferLog.topic2.slice(26);
    const amountHex = transferLog.data;
    const amountWei = BigInt(amountHex);
    const amountUSDT = Number(amountWei) / 1e18;

    // Verify recipient matches payment address
    if (recipient.toLowerCase() !== recipientAddress.toLowerCase()) {
      return { 
        isValid: false, 
        error: "Payment was not sent to the correct address" 
      };
    }

    // Verify sender
    if (txData.from_address.toLowerCase() !== senderAddress.toLowerCase()) {
      return { 
        isValid: false, 
        error: "Transaction sender does not match your wallet address" 
      };
    }

    // Verify amount
    const requiredAmountNum = parseFloat(requiredAmount);
    if (amountUSDT < requiredAmountNum) {
      return { 
        isValid: false, 
        error: `Insufficient amount. Required: ${requiredAmount} USDT, Received: ${amountUSDT.toFixed(2)} USDT` 
      };
    }

    return { 
      isValid: true, 
      amount: amountUSDT.toFixed(2) 
    };

  } catch (error: any) {
    console.error("Error verifying USDT payment:", error);
    return { 
      isValid: false, 
      error: error.message || "Failed to verify transaction" 
    };
  }
}

export async function checkWalletHasPaidBefore(
  walletAddress: string,
  recipientAddress: string,
  minimumAmount: string
): Promise<boolean> {
  try {
    const USDT_BEP20_ADDRESS = process.env.USDT_BEP20_ADDRESS?.toLowerCase();
    if (!USDT_BEP20_ADDRESS) {
      return false;
    }

    const transactions = await getWalletTransactions(walletAddress, "bsc");

    const hasPayment = transactions.some((tx) => {
      const transfer = tx.token_transfers?.find(
        (t) =>
          t.token_address.toLowerCase() === USDT_BEP20_ADDRESS &&
          t.to_address.toLowerCase() === recipientAddress.toLowerCase() &&
          t.from_address.toLowerCase() === walletAddress.toLowerCase()
      );

      if (!transfer) return false;

      const amount = parseInt(transfer.value) / Math.pow(10, transfer.token_decimals);
      return amount >= parseFloat(minimumAmount);
    });

    return hasPayment;
  } catch (error) {
    console.error("Error checking wallet payment history:", error);
    return false;
  }
}