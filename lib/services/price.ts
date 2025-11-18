import { db, tokenPrices } from '@/lib/db';
import { and, eq, gte, lte } from 'drizzle-orm';

// Major tokens that should be cached (3 hours)
const MAJOR_TOKENS = new Set([
  'So11111111111111111111111111111111111111112', // SOL
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', // mSOL
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs', // ETH (Wormhole)
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', // JUP
]);

const CACHE_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hours for major tokens

interface PriceResult {
  priceUsd: number | null;
  source: string;
  cached: boolean;
}

// Check cache for price
async function checkCache(tokenAddress: string, timestamp: Date): Promise<PriceResult | null> {
  // Only check cache for major tokens
  if (!MAJOR_TOKENS.has(tokenAddress)) {
    return null;
  }

  const cacheWindow = new Date(timestamp.getTime() - CACHE_DURATION_MS);

  const cached = await db
    .select()
    .from(tokenPrices)
    .where(
      and(
        eq(tokenPrices.tokenAddress, tokenAddress),
        gte(tokenPrices.timestamp, cacheWindow),
        lte(tokenPrices.timestamp, new Date(timestamp.getTime() + CACHE_DURATION_MS))
      )
    )
    .limit(1);

  if (cached.length > 0 && cached[0].priceUsd) {
    return {
      priceUsd: Number(cached[0].priceUsd),
      source: cached[0].source || 'cache',
      cached: true,
    };
  }

  return null;
}

// Save price to cache
async function saveToCache(
  tokenAddress: string,
  timestamp: Date,
  priceUsd: number,
  source: string
): Promise<void> {
  try {
    await db.insert(tokenPrices).values({
      tokenAddress,
      timestamp,
      priceUsd: priceUsd.toString(),
      source,
    }).onConflictDoNothing();
  } catch (error) {
    console.error('Error saving price to cache:', error);
  }
}

// Fetch from Birdeye API
async function fetchBirdeyePrice(tokenAddress: string): Promise<number | null> {
  const apiKey = process.env.BIRDEYE_API_KEY;
  if (!apiKey || apiKey === 'your_birdeye_api_key_here') {
    return null;
  }

  try {
    const response = await fetch(
      `https://public-api.birdeye.so/defi/price?address=${tokenAddress}`,
      {
        headers: {
          'X-API-KEY': apiKey,
        },
      }
    );

    if (!response.ok) {
      console.log(`Birdeye API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.data?.value || null;
  } catch (error) {
    console.error('Birdeye fetch error:', error);
    return null;
  }
}

// Fetch from DexScreener API (free, no auth)
async function fetchDexScreenerPrice(tokenAddress: string): Promise<number | null> {
  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
    );

    if (!response.ok) {
      console.log(`DexScreener API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Get the first pair with the highest liquidity
    if (data.pairs && data.pairs.length > 0) {
      // Sort by liquidity and get the best price
      const sortedPairs = data.pairs.sort(
        (a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
      );
      return parseFloat(sortedPairs[0].priceUsd) || null;
    }

    return null;
  } catch (error) {
    console.error('DexScreener fetch error:', error);
    return null;
  }
}

// Main function: get token price with waterfall approach
export async function getTokenPrice(
  tokenAddress: string,
  timestamp: Date = new Date()
): Promise<PriceResult> {
  // 1. Check cache first (for major tokens only)
  const cached = await checkCache(tokenAddress, timestamp);
  if (cached) {
    return cached;
  }

  // 2. Try Birdeye (best for Solana)
  const birdeyePrice = await fetchBirdeyePrice(tokenAddress);
  if (birdeyePrice !== null) {
    // Save to cache for major tokens
    if (MAJOR_TOKENS.has(tokenAddress)) {
      await saveToCache(tokenAddress, timestamp, birdeyePrice, 'birdeye');
    }
    return {
      priceUsd: birdeyePrice,
      source: 'birdeye',
      cached: false,
    };
  }

  // 3. Try DexScreener (good for micro-caps)
  const dexScreenerPrice = await fetchDexScreenerPrice(tokenAddress);
  if (dexScreenerPrice !== null) {
    // Save to cache for major tokens
    if (MAJOR_TOKENS.has(tokenAddress)) {
      await saveToCache(tokenAddress, timestamp, dexScreenerPrice, 'dexscreener');
    }
    return {
      priceUsd: dexScreenerPrice,
      source: 'dexscreener',
      cached: false,
    };
  }

  // 4. No price found
  return {
    priceUsd: null,
    source: 'none',
    cached: false,
  };
}

// Get multiple token prices in batch
export async function getTokenPrices(
  tokenAddresses: string[],
  timestamp: Date = new Date()
): Promise<Map<string, PriceResult>> {
  const results = new Map<string, PriceResult>();

  // Deduplicate addresses
  const uniqueAddresses = [...new Set(tokenAddresses)];

  // Fetch prices in parallel (with some rate limiting)
  const batchSize = 5;
  for (let i = 0; i < uniqueAddresses.length; i += batchSize) {
    const batch = uniqueAddresses.slice(i, i + batchSize);
    const promises = batch.map(async (address) => {
      const price = await getTokenPrice(address, timestamp);
      results.set(address, price);
    });
    await Promise.all(promises);

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < uniqueAddresses.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}

// Get USD to IDR exchange rate
export async function getUsdToIdrRate(): Promise<number> {
  try {
    // Using a free API for exchange rates
    const response = await fetch(
      'https://api.exchangerate-api.com/v4/latest/USD'
    );

    if (!response.ok) {
      // Fallback to approximate rate
      return 15500;
    }

    const data = await response.json();
    return data.rates?.IDR || 15500;
  } catch (error) {
    console.error('Error fetching USD/IDR rate:', error);
    // Fallback to approximate rate
    return 15500;
  }
}
