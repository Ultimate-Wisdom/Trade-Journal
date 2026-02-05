/**
 * Price Service - Fetches live cryptocurrency prices from CoinGecko Free API
 */

interface CoinGeckoPriceResponse {
  [coinId: string]: {
    usd: number;
  };
}

// In-memory cache to prevent rate limiting
const CACHE: {
  prices: Map<string, number>;
  lastFetchTime: number;
} = {
  prices: new Map<string, number>(),
  lastFetchTime: 0,
};

const CACHE_DURATION_MS = 0; // Temporarily disabled to force fresh fetches

/**
 * Fetch live prices for cryptocurrency IDs from CoinGecko
 * @param ids Array of CoinGecko API IDs (e.g., ['bitcoin', 'solana', 'ethereum'])
 * @returns Map of coin ID to USD price
 */
export async function getLivePrices(ids: string[]): Promise<Map<string, number>> {
  if (!ids || ids.length === 0) {
    return new Map();
  }

  // Sanitize IDs: trim whitespace, convert to lowercase, filter empty strings
  const cleanIds = ids.map(id => id.trim().toLowerCase()).filter(id => id.length > 0);
  
  if (cleanIds.length === 0) {
    console.warn('⚠️  No valid CoinGecko IDs after sanitization');
    return new Map();
  }

  // Check if cache is still valid (less than 1 minute old)
  const now = Date.now();
  const timeSinceLastFetch = now - CACHE.lastFetchTime;
  
  if (timeSinceLastFetch < CACHE_DURATION_MS && CACHE.prices.size > 0) {
    // Cache is valid - return cached prices
    const expiresInSeconds = Math.floor((CACHE_DURATION_MS - timeSinceLastFetch) / 1000);
    console.log(`💾 Using cached prices (expires in ${expiresInSeconds}s)`);
    return CACHE.prices;
  }

  // Cache expired or empty - fetch new prices from API
  try {
    // Log the request
    console.log('📡 Fetching CoinGecko IDs:', cleanIds);

    // CoinGecko Free API endpoint for simple price
    // Docs: https://www.coingecko.com/api/documentation
    const idsParam = cleanIds.join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=usd`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`❌ CoinGecko API error: ${response.status} ${response.statusText}`);
      // Return cached prices if available, even if stale, to avoid breaking the app
      if (CACHE.prices.size > 0) {
        console.log('⚠️  API error, returning stale cached prices');
        return CACHE.prices;
      }
      return new Map();
    }

    const data: CoinGeckoPriceResponse = await response.json();
    
    // Log the response keys
    console.log('📥 CoinGecko Response Keys:', Object.keys(data));

    const priceMap = new Map<string, number>();

    // Extract prices from response
    for (const [coinId, priceData] of Object.entries(data)) {
      if (priceData && typeof priceData.usd === 'number') {
        priceMap.set(coinId, priceData.usd);
      }
    }

    // Log which IDs were requested but not found in response
    const missingIds = cleanIds.filter(id => !priceMap.has(id));
    if (missingIds.length > 0) {
      console.warn(`⚠️  CoinGecko IDs not found in response: ${missingIds.join(', ')}`);
    }

    // Update cache with new prices
    CACHE.prices = priceMap;
    CACHE.lastFetchTime = Date.now();

    return priceMap;
  } catch (error) {
    console.error('❌ Failed to fetch live prices from CoinGecko:', error);
    // Return cached prices if available, even if stale, to avoid breaking the app
    if (CACHE.prices.size > 0) {
      console.log('⚠️  API failed, returning stale cached prices');
      return CACHE.prices;
    }
    return new Map();
  }
}

/**
 * Calculate the USD value of a crypto asset
 * @param quantity Quantity of the asset
 * @param apiId CoinGecko API ID
 * @param prices Price map from getLivePrices
 * @returns USD value or null if price not available
 */
export function calculateCryptoValue(
  quantity: number | string | null,
  apiId: string | null,
  prices: Map<string, number>
): number | null {
  if (!quantity || !apiId) {
    return null;
  }

  const qty = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
  
  // Sanitize API ID to match the cleaned IDs used in the price map
  const sanitizedApiId = apiId.trim().toLowerCase();
  const price = prices.get(sanitizedApiId);

  if (!price || isNaN(qty)) {
    return null;
  }

  return qty * price;
}
