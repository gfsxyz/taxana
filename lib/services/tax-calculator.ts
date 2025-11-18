import type { Transaction } from '@/lib/db/schema';
import { getTokenPrices, getUsdToIdrRate } from './price';

// Indonesian tax rates for DEX (unregistered exchange)
const TAX_RATES = {
  PPH_SELL: 0.002, // 0.2% on sell transactions
  PPN_BUY: 0.0022, // 0.22% on buy transactions (before Aug 2025)
};

// Token lot for FIFO tracking
interface TokenLot {
  tokenAddress: string;
  amount: number;
  costBasisUsd: number;
  costBasisIdr: number;
  timestamp: Date;
}

// Result for each transaction
export interface TransactionTaxResult {
  signature: string;
  timestamp: Date;
  type: 'buy' | 'sell';
  fromToken: string;
  fromSymbol: string;
  fromAmount: number;
  toToken: string;
  toSymbol: string;
  toAmount: number;
  dex: string;

  // Prices
  fromPriceUsd: number | null;
  toPriceUsd: number | null;
  usdIdrRate: number;

  // Values
  transactionValueUsd: number;
  transactionValueIdr: number;

  // FIFO calculation (for sells)
  costBasisUsd: number;
  costBasisIdr: number;
  gainLossUsd: number;
  gainLossIdr: number;

  // Taxes
  pphTax: number; // IDR
  ppnTax: number; // IDR
  totalTax: number; // IDR
}

// Summary of all calculations
export interface TaxSummary {
  totalTransactions: number;
  totalBuys: number;
  totalSells: number;

  totalBuyValueIdr: number;
  totalSellValueIdr: number;

  totalGainIdr: number;
  totalLossIdr: number;
  netGainLossIdr: number;

  totalPphTax: number;
  totalPpnTax: number;
  totalTax: number;

  transactions: TransactionTaxResult[];
}

export async function calculateTaxes(
  transactions: Transaction[]
): Promise<TaxSummary> {
  if (transactions.length === 0) {
    return {
      totalTransactions: 0,
      totalBuys: 0,
      totalSells: 0,
      totalBuyValueIdr: 0,
      totalSellValueIdr: 0,
      totalGainIdr: 0,
      totalLossIdr: 0,
      netGainLossIdr: 0,
      totalPphTax: 0,
      totalPpnTax: 0,
      totalTax: 0,
      transactions: [],
    };
  }

  // Get USD/IDR rate
  const usdIdrRate = await getUsdToIdrRate();

  // Collect all unique token addresses
  const tokenAddresses = new Set<string>();
  transactions.forEach(tx => {
    if (tx.fromToken) tokenAddresses.add(tx.fromToken);
    if (tx.toToken) tokenAddresses.add(tx.toToken);
  });

  // Fetch all prices
  const prices = await getTokenPrices([...tokenAddresses]);

  // FIFO lots per token
  const tokenLots = new Map<string, TokenLot[]>();

  // Sort transactions by timestamp (oldest first for FIFO)
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const results: TransactionTaxResult[] = [];
  let totalBuys = 0;
  let totalSells = 0;
  let totalBuyValueIdr = 0;
  let totalSellValueIdr = 0;
  let totalGainIdr = 0;
  let totalLossIdr = 0;
  let totalPphTax = 0;
  let totalPpnTax = 0;

  for (const tx of sortedTransactions) {
    const fromToken = tx.fromToken || '';
    const toToken = tx.toToken || '';
    const fromAmount = Number(tx.fromAmount) || 0;
    const toAmount = Number(tx.toAmount) || 0;

    const fromPrice = prices.get(fromToken)?.priceUsd || 0;
    const toPrice = prices.get(toToken)?.priceUsd || 0;

    // Calculate transaction value (use the "to" side as the value)
    const transactionValueUsd = toAmount * toPrice;
    const transactionValueIdr = transactionValueUsd * usdIdrRate;

    // Determine if this is a buy or sell
    // Buy = acquiring a non-stable token (SOL/USDC -> token)
    // Sell = disposing of a non-stable token (token -> SOL/USDC)
    const stableTokens = new Set([
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
    ]);
    const solToken = 'So11111111111111111111111111111111111111112';

    const fromIsStableOrSol = stableTokens.has(fromToken) || fromToken === solToken;
    const toIsStableOrSol = stableTokens.has(toToken) || toToken === solToken;

    let type: 'buy' | 'sell';
    let costBasisUsd = 0;
    let costBasisIdr = 0;
    let gainLossUsd = 0;
    let gainLossIdr = 0;
    let pphTax = 0;
    let ppnTax = 0;

    if (fromIsStableOrSol && !toIsStableOrSol) {
      // BUY: Acquiring a token with SOL/USDC
      type = 'buy';
      totalBuys++;
      totalBuyValueIdr += transactionValueIdr;

      // Add to FIFO lots
      const costUsd = fromAmount * fromPrice;
      const costIdr = costUsd * usdIdrRate;

      const lot: TokenLot = {
        tokenAddress: toToken,
        amount: toAmount,
        costBasisUsd: costUsd,
        costBasisIdr: costIdr,
        timestamp: new Date(tx.timestamp),
      };

      if (!tokenLots.has(toToken)) {
        tokenLots.set(toToken, []);
      }
      tokenLots.get(toToken)!.push(lot);

      // PPN tax on buy
      ppnTax = transactionValueIdr * TAX_RATES.PPN_BUY;
      totalPpnTax += ppnTax;

    } else if (!fromIsStableOrSol && toIsStableOrSol) {
      // SELL: Disposing a token for SOL/USDC
      type = 'sell';
      totalSells++;
      totalSellValueIdr += transactionValueIdr;

      // Calculate FIFO cost basis
      const lots = tokenLots.get(fromToken) || [];
      let remainingToSell = fromAmount;
      let totalCostUsd = 0;
      let totalCostIdr = 0;

      while (remainingToSell > 0 && lots.length > 0) {
        const lot = lots[0];

        if (lot.amount <= remainingToSell) {
          // Use entire lot
          totalCostUsd += lot.costBasisUsd;
          totalCostIdr += lot.costBasisIdr;
          remainingToSell -= lot.amount;
          lots.shift(); // Remove lot
        } else {
          // Use partial lot
          const fraction = remainingToSell / lot.amount;
          totalCostUsd += lot.costBasisUsd * fraction;
          totalCostIdr += lot.costBasisIdr * fraction;
          lot.amount -= remainingToSell;
          lot.costBasisUsd *= (1 - fraction);
          lot.costBasisIdr *= (1 - fraction);
          remainingToSell = 0;
        }
      }

      costBasisUsd = totalCostUsd;
      costBasisIdr = totalCostIdr;

      // Calculate gain/loss
      const proceedsUsd = fromAmount * fromPrice;
      gainLossUsd = proceedsUsd - costBasisUsd;
      gainLossIdr = gainLossUsd * usdIdrRate;

      if (gainLossIdr > 0) {
        totalGainIdr += gainLossIdr;
      } else {
        totalLossIdr += Math.abs(gainLossIdr);
      }

      // PPH tax on sell
      pphTax = transactionValueIdr * TAX_RATES.PPH_SELL;
      totalPphTax += pphTax;

    } else {
      // Token to token swap - treat as sell + buy
      // For simplicity, we'll treat this as a sell (taxable event)
      type = 'sell';
      totalSells++;
      totalSellValueIdr += transactionValueIdr;

      // FIFO for the from token
      const lots = tokenLots.get(fromToken) || [];
      let remainingToSell = fromAmount;
      let totalCostUsd = 0;
      let totalCostIdr = 0;

      while (remainingToSell > 0 && lots.length > 0) {
        const lot = lots[0];

        if (lot.amount <= remainingToSell) {
          totalCostUsd += lot.costBasisUsd;
          totalCostIdr += lot.costBasisIdr;
          remainingToSell -= lot.amount;
          lots.shift();
        } else {
          const fraction = remainingToSell / lot.amount;
          totalCostUsd += lot.costBasisUsd * fraction;
          totalCostIdr += lot.costBasisIdr * fraction;
          lot.amount -= remainingToSell;
          lot.costBasisUsd *= (1 - fraction);
          lot.costBasisIdr *= (1 - fraction);
          remainingToSell = 0;
        }
      }

      costBasisUsd = totalCostUsd;
      costBasisIdr = totalCostIdr;

      // Gain/loss
      gainLossUsd = transactionValueUsd - costBasisUsd;
      gainLossIdr = gainLossUsd * usdIdrRate;

      if (gainLossIdr > 0) {
        totalGainIdr += gainLossIdr;
      } else {
        totalLossIdr += Math.abs(gainLossIdr);
      }

      // Add the received token as a new lot
      const newLot: TokenLot = {
        tokenAddress: toToken,
        amount: toAmount,
        costBasisUsd: transactionValueUsd,
        costBasisIdr: transactionValueIdr,
        timestamp: new Date(tx.timestamp),
      };

      if (!tokenLots.has(toToken)) {
        tokenLots.set(toToken, []);
      }
      tokenLots.get(toToken)!.push(newLot);

      // PPH tax on the sell portion
      pphTax = transactionValueIdr * TAX_RATES.PPH_SELL;
      totalPphTax += pphTax;
    }

    results.push({
      signature: tx.signature,
      timestamp: new Date(tx.timestamp),
      type,
      fromToken,
      fromSymbol: tx.fromSymbol || '',
      fromAmount,
      toToken,
      toSymbol: tx.toSymbol || '',
      toAmount,
      dex: tx.dex || 'unknown',
      fromPriceUsd: fromPrice,
      toPriceUsd: toPrice,
      usdIdrRate,
      transactionValueUsd,
      transactionValueIdr,
      costBasisUsd,
      costBasisIdr,
      gainLossUsd,
      gainLossIdr,
      pphTax,
      ppnTax,
      totalTax: pphTax + ppnTax,
    });
  }

  return {
    totalTransactions: transactions.length,
    totalBuys,
    totalSells,
    totalBuyValueIdr,
    totalSellValueIdr,
    totalGainIdr,
    totalLossIdr,
    netGainLossIdr: totalGainIdr - totalLossIdr,
    totalPphTax,
    totalPpnTax,
    totalTax: totalPphTax + totalPpnTax,
    transactions: results,
  };
}
