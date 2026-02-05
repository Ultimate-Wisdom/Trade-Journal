/**
 * Price Service - Fetches live cryptocurrency prices from Binance Public API
 */

interface BinanceTickerResponse {
  symbol: string;
  price: string;
}

interface Binance24hrResponse {
  symbol: string;
  priceChangePercent: string;
}

// Mapping from CoinGecko IDs to Binance tickers
const COINGECKO_TO_BINANCE: Record<string, string> = {
  'bitcoin': 'BTCUSDT',
  'ethereum': 'ETHUSDT',
  'solana': 'SOLUSDT',
  'ripple': 'XRPUSDT',
  'xrp': 'XRPUSDT', // Alternative name
  'usd-coin': 'USDCUSDT',
  'usdc': 'USDCUSDT', // Alternative name
  'tether': 'USDT', // Special case - will be handled separately
};

// In-memory cache to prevent rate limiting
const CACHE: {
  prices: Map<string, number>;
  lastFetchTime: number;
} = {
  prices: new Map<string, number>(),
  lastFetchTime: 0,
};

const CACHE_DURATION_MS = 60 * 1000; // 1 minute cache

/**
 * Fetch live prices for cryptocurrency IDs from Binance
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
    console.warn('⚠️  No valid asset IDs after sanitization');
    return new Map();
  }

  // Check if cache is still valid
  const now = Date.now();
  const timeSinceLastFetch = now - CACHE.lastFetchTime;
  
  if (timeSinceLastFetch < CACHE_DURATION_MS && CACHE.prices.size > 0) {
    // Cache is valid - return cached prices for requested IDs
    const cachedResult = new Map<string, number>();
    for (const id of cleanIds) {
      const price = CACHE.prices.get(id);
      if (price !== undefined) {
        cachedResult.set(id, price);
      }
    }
    if (cachedResult.size > 0) {
      const expiresInSeconds = Math.floor((CACHE_DURATION_MS - timeSinceLastFetch) / 1000);
      console.log(`💾 Using cached prices (expires in ${expiresInSeconds}s)`);
      return cachedResult;
    }
  }

  // Cache expired or empty - fetch new prices from Binance API
  try {
    console.log('📡 Fetching Binance prices for IDs:', cleanIds);

    // Map CoinGecko IDs to Binance tickers
    const tickerMap = new Map<string, string>(); // CoinGecko ID -> Binance ticker
    const binanceTickers: string[] = [];
    
    for (const id of cleanIds) {
      // Special case: Tether is always $1.00
      if (id === 'tether' || id === 'usdt') {
        continue; // Will be handled separately
      }
      
      const ticker = COINGECKO_TO_BINANCE[id];
      if (ticker) {
        tickerMap.set(id, ticker);
        if (!binanceTickers.includes(ticker)) {
          binanceTickers.push(ticker);
        }
      } else {
        console.warn(`⚠️  No Binance ticker mapping for: ${id}`);
      }
    }

    const priceMap = new Map<string, number>();

    // Handle Tether separately (always $1.00)
    if (cleanIds.includes('tether') || cleanIds.includes('usdt')) {
      priceMap.set('tether', 1.00);
      priceMap.set('usdt', 1.00);
    }

    // Fetch prices from Binance if we have any tickers
    if (binanceTickers.length > 0) {
      // Binance Public API endpoint for ticker price
      // Docs: https://binance-docs.github.io/apidocs/spot/en/#24hr-ticker-price-change-statistics
      const url = `https://api.binance.com/api/v3/ticker/price`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`❌ Binance API error: ${response.status} ${response.statusText}`);
        // Return cached prices if available, even if stale
        if (CACHE.prices.size > 0) {
          console.log('⚠️  API error, returning stale cached prices');
          const staleResult = new Map<string, number>();
          for (const id of cleanIds) {
            const price = CACHE.prices.get(id);
            if (price !== undefined) {
              staleResult.set(id, price);
            }
          }
          return staleResult;
        }
        return priceMap; // Return what we have (Tether if applicable)
      }

      const data: BinanceTickerResponse[] = await response.json();
      
      // Create a map of Binance ticker -> price
      const binancePriceMap = new Map<string, number>();
      for (const ticker of data) {
        const price = parseFloat(ticker.price);
        if (!isNaN(price)) {
          binancePriceMap.set(ticker.symbol, price);
        }
      }

      // Map Binance prices back to CoinGecko IDs
      for (const [coinGeckoId, binanceTicker] of tickerMap.entries()) {
        const price = binancePriceMap.get(binanceTicker);
        if (price !== undefined && price > 0) {
          priceMap.set(coinGeckoId, price);
          console.log(`✅ ${coinGeckoId} (${binanceTicker}): $${price.toFixed(2)}`);
        } else {
          console.warn(`⚠️  Price not found for ${coinGeckoId} (${binanceTicker})`);
        }
      }
    }

    // Log which IDs were requested but not found
    const missingIds = cleanIds.filter(id => !priceMap.has(id));
    if (missingIds.length > 0) {
      console.warn(`⚠️  Prices not available for: ${missingIds.join(', ')}`);
    }

    // Update cache with new prices (merge with existing cache)
    for (const [id, price] of priceMap.entries()) {
      CACHE.prices.set(id, price);
    }
    CACHE.lastFetchTime = Date.now();

    return priceMap;
  } catch (error) {
    console.error('❌ Failed to fetch live prices from Binance:', error);
    // Return cached prices if available, even if stale
    if (CACHE.prices.size > 0) {
      console.log('⚠️  API failed, returning stale cached prices');
      const staleResult = new Map<string, number>();
      for (const id of cleanIds) {
        const price = CACHE.prices.get(id);
        if (price !== undefined) {
          staleResult.set(id, price);
        }
      }
      return staleResult;
    }
    return new Map();
  }
}

/**
 * Calculate the USD value of a crypto asset
 * @param quantity Quantity of the asset
 * @param apiId CoinGecko API ID (or Binance ticker)
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
