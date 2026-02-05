/**
 * Price Service - Hybrid approach: Binance for major coins, Jupiter for Solana tokens
 */

interface BinanceTickerResponse {
  symbol: string;
  price: string;
}

interface JupiterPriceResponse {
  data: {
    [tokenId: string]: {
      id: string;
      mintSymbol: string;
      vsToken: string;
      vsTokenSymbol: string;
      price: string;
    };
  };
}

// Mapping from CoinGecko IDs to Binance tickers (major coins)
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

// Mapping from CoinGecko IDs to Jupiter mint addresses (Solana tokens)
// Jupiter API requires mint addresses, not token names
const SOLANA_MINTS: Record<string, string> = {
  'jito-staked-sol': 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', // Official JitoSOL Mint
  'jitosol': 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', // Alternative name
  'ghostwareos': 'BBKPiLM9KjdJW7oQSKt99RVWcZdhF6sEHRKnwqeBGHST', // Official GhostwareOS Mint
  'ghost': 'BBKPiLM9KjdJW7oQSKt99RVWcZdhF6sEHRKnwqeBGHST', // Alternative name
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

  // Cache expired or empty - fetch new prices using hybrid approach
  try {
    console.log('📡 Fetching prices for IDs:', cleanIds);

    // Separate IDs into Binance and Jupiter categories
    const binanceIds: string[] = [];
    const jupiterIds: string[] = [];
    
    for (const id of cleanIds) {
      // Special case: Tether is always $1.00
      if (id === 'tether' || id === 'usdt') {
        continue; // Will be handled separately
      }
      
      // Check if it's a Solana token (Jupiter) - uses mint addresses
      if (SOLANA_MINTS[id]) {
        jupiterIds.push(id);
      } 
      // Check if it's a major coin (Binance)
      else if (COINGECKO_TO_BINANCE[id]) {
        binanceIds.push(id);
      } else {
        console.warn(`⚠️  No price source mapping for: ${id}`);
      }
    }

    const priceMap = new Map<string, number>();

    // Handle Tether separately (always $1.00)
    if (cleanIds.includes('tether') || cleanIds.includes('usdt')) {
      priceMap.set('tether', 1.00);
      priceMap.set('usdt', 1.00);
    }

    // Step 1: Fetch major coins from Binance
    if (binanceIds.length > 0) {
      try {
        console.log('📡 Step 1: Fetching from Binance for:', binanceIds);
        
        // Map CoinGecko IDs to Binance tickers
        const tickerMap = new Map<string, string>(); // CoinGecko ID -> Binance ticker
        const binanceTickers: string[] = [];
        
        for (const id of binanceIds) {
          const ticker = COINGECKO_TO_BINANCE[id];
          if (ticker) {
            tickerMap.set(id, ticker);
            if (!binanceTickers.includes(ticker)) {
              binanceTickers.push(ticker);
            }
          }
        }

        // Binance Public API endpoint for ticker price
        const url = `https://api.binance.com/api/v3/ticker/price`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (response.ok) {
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
              console.log(`✅ Binance: ${coinGeckoId} (${binanceTicker}): $${price.toFixed(2)}`);
            } else {
              console.warn(`⚠️  Binance price not found for ${coinGeckoId} (${binanceTicker})`);
            }
          }
        } else {
          console.error(`❌ Binance API error: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error('❌ Failed to fetch from Binance:', error);
      }
    }

    // Step 2: Fetch Solana tokens from Jupiter API
    if (jupiterIds.length > 0) {
      try {
        console.log('📡 Step 2: Fetching from Jupiter for:', jupiterIds);
        
        // Map CoinGecko IDs to Jupiter mint addresses
        const jupiterMintAddresses: string[] = [];
        const jupiterIdMap = new Map<string, string>(); // CoinGecko ID -> Jupiter mint address
        
        for (const id of jupiterIds) {
          const mintAddress = SOLANA_MINTS[id];
          if (mintAddress) {
            // Avoid duplicates (multiple IDs can map to same mint)
            if (!jupiterMintAddresses.includes(mintAddress)) {
              jupiterMintAddresses.push(mintAddress);
            }
            jupiterIdMap.set(id, mintAddress);
          }
        }

        if (jupiterMintAddresses.length > 0) {
          // Jupiter API endpoint for price (requires mint addresses, not token names)
          // Docs: https://station.jup.ag/docs/apis/price-api
          const idsParam = jupiterMintAddresses.join(',');
          const url = `https://api.jup.ag/price/v2?ids=${idsParam}`;

          console.log(`🔗 Jupiter API URL: ${url}`);

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          });

          if (response.ok) {
            const data: JupiterPriceResponse = await response.json();
            
            // Extract prices from Jupiter response
            // Jupiter returns prices keyed by mint address
            for (const [coinGeckoId, mintAddress] of jupiterIdMap.entries()) {
              const tokenData = data.data[mintAddress];
              if (tokenData && tokenData.price) {
                const price = parseFloat(tokenData.price);
                if (!isNaN(price) && price > 0) {
                  priceMap.set(coinGeckoId, price);
                  console.log(`✅ Jupiter: ${coinGeckoId} (${mintAddress.substring(0, 8)}...): $${price.toFixed(6)}`);
                } else {
                  console.warn(`⚠️  Invalid Jupiter price for ${coinGeckoId} (mint: ${mintAddress})`);
                }
              } else {
                console.warn(`⚠️  Jupiter price not found for ${coinGeckoId} (mint: ${mintAddress})`);
                // Log available keys for debugging
                if (data.data) {
                  console.log(`   Available Jupiter tokens: ${Object.keys(data.data).join(', ')}`);
                }
              }
            }
          } else {
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error(`❌ Jupiter API error: ${response.status} ${response.statusText}`, errorText);
            // Continue - don't fail the entire request if Jupiter fails
          }
        }
      } catch (error) {
        console.error('❌ Failed to fetch from Jupiter:', error);
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
