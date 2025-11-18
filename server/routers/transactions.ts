import { z } from 'zod/v4';
import { router, publicProcedure } from '../trpc/trpc';
import { db, transactions } from '@/lib/db';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { calculateTaxes } from '@/lib/services/tax-calculator';

// Helius API types
interface HeliusTransaction {
  signature: string;
  timestamp: number;
  type: string;
  source: string;
  tokenTransfers: Array<{
    fromTokenAccount: string;
    toTokenAccount: string;
    fromUserAccount: string;
    toUserAccount: string;
    tokenAmount: number;
    mint: string;
    tokenStandard: string;
  }>;
  nativeTransfers: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  events: {
    swap?: {
      nativeInput?: {
        account: string;
        amount: string;
      };
      nativeOutput?: {
        account: string;
        amount: string;
      };
      tokenInputs: Array<{
        userAccount: string;
        tokenAccount: string;
        mint: string;
        rawTokenAmount: {
          tokenAmount: string;
          decimals: number;
        };
      }>;
      tokenOutputs: Array<{
        userAccount: string;
        tokenAccount: string;
        mint: string;
        rawTokenAmount: {
          tokenAmount: string;
          decimals: number;
        };
      }>;
      innerSwaps: Array<{
        programInfo: {
          source: string;
          account: string;
          programName: string;
          instructionName: string;
        };
      }>;
    };
  };
}

// Known token symbols (we'll expand this)
const TOKEN_SYMBOLS: Record<string, string> = {
  'So11111111111111111111111111111111111111112': 'SOL',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
};

// Helper to get token symbol
function getTokenSymbol(mint: string): string {
  return TOKEN_SYMBOLS[mint] || mint.slice(0, 4) + '...' + mint.slice(-4);
}

// Helper to parse swap transaction
function parseSwapTransaction(tx: HeliusTransaction, walletAddress: string) {
  const swap = tx.events?.swap;
  if (!swap) return null;

  let fromToken = '';
  let fromAmount = '0';
  let fromSymbol = '';
  let toToken = '';
  let toAmount = '0';
  let toSymbol = '';

  // Check for native SOL input
  if (swap.nativeInput && swap.nativeInput.account === walletAddress) {
    fromToken = 'So11111111111111111111111111111111111111112';
    fromAmount = (Number(swap.nativeInput.amount) / 1e9).toString();
    fromSymbol = 'SOL';
  }

  // Check for token inputs
  if (swap.tokenInputs && swap.tokenInputs.length > 0) {
    const input = swap.tokenInputs.find(t => t.userAccount === walletAddress);
    if (input) {
      fromToken = input.mint;
      const decimals = input.rawTokenAmount.decimals;
      fromAmount = (Number(input.rawTokenAmount.tokenAmount) / Math.pow(10, decimals)).toString();
      fromSymbol = getTokenSymbol(input.mint);
    }
  }

  // Check for native SOL output
  if (swap.nativeOutput && swap.nativeOutput.account === walletAddress) {
    toToken = 'So11111111111111111111111111111111111111112';
    toAmount = (Number(swap.nativeOutput.amount) / 1e9).toString();
    toSymbol = 'SOL';
  }

  // Check for token outputs
  if (swap.tokenOutputs && swap.tokenOutputs.length > 0) {
    const output = swap.tokenOutputs.find(t => t.userAccount === walletAddress);
    if (output) {
      toToken = output.mint;
      const decimals = output.rawTokenAmount.decimals;
      toAmount = (Number(output.rawTokenAmount.tokenAmount) / Math.pow(10, decimals)).toString();
      toSymbol = getTokenSymbol(output.mint);
    }
  }

  // Determine DEX from inner swaps
  let dex = 'unknown';
  if (swap.innerSwaps && swap.innerSwaps.length > 0) {
    const programName = swap.innerSwaps[0].programInfo?.programName?.toLowerCase() || '';
    if (programName.includes('jupiter')) dex = 'jupiter';
    else if (programName.includes('raydium')) dex = 'raydium';
    else if (programName.includes('orca')) dex = 'orca';
    else dex = programName || tx.source?.toLowerCase() || 'unknown';
  }

  return {
    fromToken,
    fromAmount,
    fromSymbol,
    toToken,
    toAmount,
    toSymbol,
    dex,
  };
}

export const transactionsRouter = router({
  // Fetch transactions from Helius and store in database
  fetchTransactions: publicProcedure
    .input(z.object({
      walletAddress: z.string().min(32).max(44),
      year: z.number().min(2020).max(2030),
    }))
    .mutation(async ({ input }) => {
      const { walletAddress, year } = input;

      // Calculate date range for the tax year
      const startDate = new Date(year, 0, 1); // January 1st
      const endDate = new Date(year, 11, 31, 23, 59, 59); // December 31st

      const heliusApiKey = process.env.HELIUS_API_KEY;
      if (!heliusApiKey) {
        throw new Error('HELIUS_API_KEY tidak ditemukan');
      }

      // Fetch ALL transactions from Helius with pagination
      const heliusTransactions: HeliusTransaction[] = [];
      let lastSignature: string | undefined;
      let reachedStartOfYear = false;
      const maxPages = 50; // Safety limit to prevent infinite loops
      let pageCount = 0;

      while (!reachedStartOfYear && pageCount < maxPages) {
        pageCount++;

        // Build URL with pagination cursor
        let url = `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=${heliusApiKey}&type=SWAP`;
        if (lastSignature) {
          url += `&before=${lastSignature}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Gagal mengambil transaksi: ${response.statusText}`);
        }

        const batch: HeliusTransaction[] = await response.json();

        // No more transactions
        if (batch.length === 0) {
          break;
        }

        // Add to our collection
        heliusTransactions.push(...batch);

        // Update cursor for next page
        lastSignature = batch[batch.length - 1].signature;

        // Check if we've reached transactions before our target year
        const oldestInBatch = new Date(batch[batch.length - 1].timestamp * 1000);
        if (oldestInBatch < startDate) {
          reachedStartOfYear = true;
        }

        // Small delay to avoid rate limiting
        if (!reachedStartOfYear && pageCount < maxPages) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Filter by date range and parse transactions
      const parsedTransactions = [];

      for (const tx of heliusTransactions) {
        const txDate = new Date(tx.timestamp * 1000);

        // Skip if outside date range
        if (txDate < startDate || txDate > endDate) continue;

        // Parse swap transaction
        const swapData = parseSwapTransaction(tx, walletAddress);
        if (!swapData) continue;

        const transactionData = {
          walletAddress,
          signature: tx.signature,
          timestamp: txDate,
          type: 'swap',
          fromToken: swapData.fromToken,
          fromAmount: swapData.fromAmount,
          fromSymbol: swapData.fromSymbol,
          toToken: swapData.toToken,
          toAmount: swapData.toAmount,
          toSymbol: swapData.toSymbol,
          dex: swapData.dex,
          rawData: tx,
        };

        parsedTransactions.push(transactionData);
      }

      // Store in database (upsert to avoid duplicates)
      if (parsedTransactions.length > 0) {
        for (const tx of parsedTransactions) {
          try {
            await db.insert(transactions).values(tx).onConflictDoNothing();
          } catch (error) {
            console.error('Error inserting transaction:', tx.signature, error);
          }
        }
      }

      return {
        fetched: heliusTransactions.length,
        parsed: parsedTransactions.length,
        year,
      };
    }),

  // Get transactions for a wallet and year
  getTransactions: publicProcedure
    .input(z.object({
      walletAddress: z.string().min(32).max(44),
      year: z.number().min(2020).max(2030),
    }))
    .query(async ({ input }) => {
      const { walletAddress, year } = input;

      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);

      const result = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.walletAddress, walletAddress),
            gte(transactions.timestamp, startDate),
            lte(transactions.timestamp, endDate)
          )
        )
        .orderBy(desc(transactions.timestamp));

      return result;
    }),

  // Calculate taxes for transactions
  calculateTaxes: publicProcedure
    .input(z.object({
      walletAddress: z.string().min(32).max(44),
      year: z.number().min(2020).max(2030),
    }))
    .mutation(async ({ input }) => {
      const { walletAddress, year } = input;

      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);

      // Get transactions from database
      const txs = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.walletAddress, walletAddress),
            gte(transactions.timestamp, startDate),
            lte(transactions.timestamp, endDate)
          )
        )
        .orderBy(desc(transactions.timestamp));

      // Calculate taxes
      const taxSummary = await calculateTaxes(txs);

      return taxSummary;
    }),
});
