
import { ethers } from 'ethers';
import type { CryptoBalances } from '@shared/schema';

// RPC endpoints for different chains
const RPC_ENDPOINTS = {
  ethereum: 'https://eth.llamarpc.com',
  bsc: 'https://bsc-dataseed.binance.org',
  polygon: 'https://polygon-rpc.com',
  solana: 'https://api.mainnet-beta.solana.com',
  tron: 'https://api.trongrid.io',
};

// Token contract addresses
const TOKENS = {
  USDT_ERC20: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  USDT_BEP20: '0x55d398326f99059fF775485246999027B3197955',
  USDC_ERC20: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  USDT_TRC20: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
};

// Minimal ERC20 ABI for balance checking
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

// Fetch Bitcoin balance using blockchain.info API
async function fetchBTCBalance(address: string): Promise<string> {
  try {
    const response = await fetch(`https://blockchain.info/q/addressbalance/${address}`);
    if (!response.ok) throw new Error('Failed to fetch BTC balance');
    const satoshis = await response.text();
    const btc = parseFloat(satoshis) / 100000000;
    return btc.toFixed(8);
  } catch (error) {
    console.error('Error fetching BTC balance:', error);
    throw error;
  }
}

// Fetch Solana balance using RPC
async function fetchSOLBalance(address: string): Promise<string> {
  try {
    const response = await fetch(RPC_ENDPOINTS.solana, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [address]
      })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    const lamports = data.result.value;
    const sol = lamports / 1000000000;
    return sol.toFixed(9);
  } catch (error) {
    console.error('Error fetching SOL balance:', error);
    throw error;
  }
}

// Fetch TRON (TRX) balance using TronGrid API
async function fetchTRXBalance(address: string): Promise<string> {
  try {
    const response = await fetch(`${RPC_ENDPOINTS.tron}/v1/accounts/${address}`);
    if (!response.ok) throw new Error('Failed to fetch TRX balance');
    const data = await response.json();
    const sun = data.data?.[0]?.balance || 0;
    const trx = sun / 1000000;
    return trx.toFixed(6);
  } catch (error) {
    console.error('Error fetching TRX balance:', error);
    throw error;
  }
}

// Fetch USDT TRC20 balance
async function fetchUSDT_TRC20Balance(address: string): Promise<string> {
  try {
    const response = await fetch(`${RPC_ENDPOINTS.tron}/v1/accounts/${address}/transactions/trc20?contract_address=${TOKENS.USDT_TRC20}&limit=1`);
    if (!response.ok) throw new Error('Failed to fetch USDT TRC20 balance');
    const data = await response.json();
    
    // Get account info for TRC20 tokens
    const accountResponse = await fetch(`${RPC_ENDPOINTS.tron}/v1/accounts/${address}`);
    const accountData = await accountResponse.json();
    
    const trc20Tokens = accountData.data?.[0]?.trc20 || [];
    const usdtToken = Object.entries(trc20Tokens).find(([key]) => 
      key.toLowerCase() === TOKENS.USDT_TRC20.toLowerCase()
    );
    
    if (usdtToken) {
      const balance = parseFloat(usdtToken[1] as string) / 1000000;
      return balance.toFixed(6);
    }
    return '0.000000';
  } catch (error) {
    console.error('Error fetching USDT TRC20 balance:', error);
    throw error;
  }
}

// Fetch TON balance using TON API
async function fetchTONBalance(address: string): Promise<string> {
  try {
    // Using TON HTTP API
    const response = await fetch(`https://toncenter.com/api/v2/getAddressBalance?address=${address}`);
    if (!response.ok) throw new Error('Failed to fetch TON balance');
    const data = await response.json();
    if (!data.ok) throw new Error('Invalid response from TON API');
    const nanoton = data.result;
    const ton = parseFloat(nanoton) / 1000000000;
    return ton.toFixed(9);
  } catch (error) {
    console.error('Error fetching TON balance:', error);
    throw error;
  }
}

export async function fetchWalletBalances(walletAddress: string): Promise<CryptoBalances> {
  const balances: CryptoBalances = {};

  console.log('Fetching balances for wallet:', walletAddress);

  // Fetch ETH balance with timeout
  try {
    const ethProvider = new ethers.JsonRpcProvider(RPC_ENDPOINTS.ethereum, null, {
      staticNetwork: true
    });
    const balancePromise = ethProvider.getBalance(walletAddress);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('ETH timeout')), 10000)
    );
    const ethBalance = await Promise.race([balancePromise, timeoutPromise]) as bigint;
    balances.ETH = ethers.formatEther(ethBalance);
    console.log('ETH balance fetched:', balances.ETH);
  } catch (error) {
    console.error('Error fetching ETH balance:', error);
    balances.ETH = '0.00';
  }

  // Fetch BNB balance with timeout
  try {
    const bscProvider = new ethers.JsonRpcProvider(RPC_ENDPOINTS.bsc, null, {
      staticNetwork: true
    });
    const balancePromise = bscProvider.getBalance(walletAddress);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('BNB timeout')), 10000)
    );
    const bnbBalance = await Promise.race([balancePromise, timeoutPromise]) as bigint;
    balances.BNB = ethers.formatEther(bnbBalance);
    console.log('BNB balance fetched:', balances.BNB);
  } catch (error) {
    console.error('Error fetching BNB balance:', error);
    balances.BNB = '0.00';
  }

  // Fetch MATIC balance with timeout
  try {
    const polygonProvider = new ethers.JsonRpcProvider(RPC_ENDPOINTS.polygon, null, {
      staticNetwork: true
    });
    const balancePromise = polygonProvider.getBalance(walletAddress);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('MATIC timeout')), 10000)
    );
    const maticBalance = await Promise.race([balancePromise, timeoutPromise]) as bigint;
    balances.MATIC = ethers.formatEther(maticBalance);
    console.log('MATIC balance fetched:', balances.MATIC);
  } catch (error) {
    console.error('Error fetching MATIC balance:', error);
    balances.MATIC = '0.00';
  }

  // Fetch BTC balance (if valid BTC address format)
  try {
    // Simple validation for BTC address
    if (/^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/.test(walletAddress)) {
      balances.BTC = await fetchBTCBalance(walletAddress);
    } else {
      balances.BTC = '0.00000000';
    }
  } catch (error) {
    console.error('Error fetching BTC balance:', error);
    balances.BTC = '0.00000000';
  }

  // Fetch SOL balance (if valid Solana address format)
  try {
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
      balances.SOL = await fetchSOLBalance(walletAddress);
    } else {
      balances.SOL = '0.000000000';
    }
  } catch (error) {
    console.error('Error fetching SOL balance:', error);
    balances.SOL = '0.000000000';
  }

  // Fetch TRX balance (if valid TRON address format)
  try {
    if (walletAddress.startsWith('T') && walletAddress.length === 34) {
      balances.TRX = await fetchTRXBalance(walletAddress);
    } else {
      balances.TRX = '0.000000';
    }
  } catch (error) {
    console.error('Error fetching TRX balance:', error);
    balances.TRX = '0.000000';
  }

  // Fetch TON balance (if valid TON address format)
  try {
    if (/^[UEk0-9a-zA-Z_-]{48}$/.test(walletAddress)) {
      balances.TON = await fetchTONBalance(walletAddress);
    } else {
      balances.TON = '0.000000000';
    }
  } catch (error) {
    console.error('Error fetching TON balance:', error);
    balances.TON = '0.000000000';
  }

  // Fetch USDT ERC20 balance with timeout
  try {
    const ethProvider = new ethers.JsonRpcProvider(RPC_ENDPOINTS.ethereum, null, {
      staticNetwork: true
    });
    const usdtContract = new ethers.Contract(TOKENS.USDT_ERC20, ERC20_ABI, ethProvider);
    
    const balancePromise = Promise.all([
      usdtContract.balanceOf(walletAddress),
      usdtContract.decimals(),
    ]);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('USDT ERC20 timeout')), 10000)
    );
    
    const [balance, decimals] = await Promise.race([balancePromise, timeoutPromise]) as [bigint, number];
    balances.USDT_ERC20 = ethers.formatUnits(balance, decimals);
    console.log('USDT ERC20 balance fetched:', balances.USDT_ERC20);
  } catch (error) {
    console.error('Error fetching USDT ERC20 balance:', error);
    balances.USDT_ERC20 = '0.00';
  }

  // Fetch USDT BEP20 balance with timeout
  try {
    const bscProvider = new ethers.JsonRpcProvider(RPC_ENDPOINTS.bsc, null, {
      staticNetwork: true
    });
    const usdtBscContract = new ethers.Contract(TOKENS.USDT_BEP20, ERC20_ABI, bscProvider);
    
    const balancePromise = Promise.all([
      usdtBscContract.balanceOf(walletAddress),
      usdtBscContract.decimals(),
    ]);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('USDT BEP20 timeout')), 10000)
    );
    
    const [balance, decimals] = await Promise.race([balancePromise, timeoutPromise]) as [bigint, number];
    balances.USDT_BEP20 = ethers.formatUnits(balance, decimals);
    console.log('USDT BEP20 balance fetched:', balances.USDT_BEP20);
  } catch (error) {
    console.error('Error fetching USDT BEP20 balance:', error);
    balances.USDT_BEP20 = '0.00';
  }

  // Fetch USDT TRC20 balance
  try {
    if (walletAddress.startsWith('T') && walletAddress.length === 34) {
      balances.USDT_TRC20 = await fetchUSDT_TRC20Balance(walletAddress);
    } else {
      balances.USDT_TRC20 = '0.000000';
    }
  } catch (error) {
    console.error('Error fetching USDT TRC20 balance:', error);
    balances.USDT_TRC20 = '0.000000';
  }

  // Fetch USDC balance
  try {
    const ethProvider = new ethers.JsonRpcProvider(RPC_ENDPOINTS.ethereum);
    const usdcContract = new ethers.Contract(TOKENS.USDC_ERC20, ERC20_ABI, ethProvider);
    const [balance, decimals] = await Promise.all([
      usdcContract.balanceOf(walletAddress),
      usdcContract.decimals(),
    ]);
    balances.USDC = ethers.formatUnits(balance, decimals);
  } catch (error) {
    console.error('Error fetching USDC balance:', error);
    balances.USDC = '0.00';
  }

  // Always return balances - never throw error
  // This ensures wallet connection succeeds even if balance fetch fails
  return balances;
}

export async function formatBalance(balance: string, maxDecimals: number = 6): string {
  const num = parseFloat(balance);
  if (num === 0) return '0.00';
  if (num < 0.000001) return '<0.000001';
  return num.toFixed(Math.min(maxDecimals, 8));
}
