/**
 * Price Service - Fetches live cryptocurrency prices from CoinGecko Free API
 */

interface CoinGeckoPriceResponse {
  [coinId: string]: {
    usd: number;
  };
}

/**
 * Fetch live prices for cryptocurrency IDs from CoinGecko
 * @param ids Array of CoinGecko API IDs (e.g., ['bitcoin', 'solana', 'ethereum'])
 * @returns Map of coin ID to USD price
 */
export async function getLivePrices(ids: string[]): Promise<Map<string, number>> {
  if (!ids || ids.length === 0) {
    return new Map();
  }

  try {
    // CoinGecko Free API endpoint for simple price
    // Docs: https://www.coingecko.com/api/documentation
    const idsParam = ids.join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=usd`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`❌ CoinGecko API error: ${response.status} ${response.statusText}`);
      return new Map();
    }

    const data: CoinGeckoPriceResponse = await response.json();
    const priceMap = new Map<string, number>();

    // Extract prices from response
    for (const [coinId, priceData] of Object.entries(data)) {
      if (priceData && typeof priceData.usd === 'number') {
        priceMap.set(coinId, priceData.usd);
      }
    }

    return priceMap;
  } catch (error) {
    console.error('❌ Failed to fetch live prices from CoinGecko:', error);
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
  const price = prices.get(apiId);

  if (!price || isNaN(qty)) {
    return null;
  }

  return qty * price;
}
