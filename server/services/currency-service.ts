/**
 * Currency service – fetches MYR/USD rate from Frankfurter API with in-memory cache.
 * Rate = MYR per 1 USD → convert MYR to USD: balanceMyr / rate
 */

const FRANKFURTER_URL = "https://api.frankfurter.app/latest?from=USD&to=MYR";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours (API updates daily)

let cachedRate: number | null = null;
let cacheTime = 0;

export async function getMyrPerUsdRate(): Promise<number | null> {
  if (cachedRate !== null && Date.now() - cacheTime < CACHE_TTL_MS) {
    return cachedRate;
  }

  try {
    const res = await fetch(FRANKFURTER_URL, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Frankfurter API ${res.status}`);
    const data = (await res.json()) as { rates?: { MYR?: number } };
    const rate = data.rates?.MYR;
    if (typeof rate !== "number" || rate <= 0) throw new Error("Invalid MYR rate");
    cachedRate = rate;
    cacheTime = Date.now();
    return rate;
  } catch (err) {
    console.warn("⚠️ Currency rate fetch failed, using fallback:", (err as Error).message);
    return null;
  }
}

/**
 * Returns MYR per 1 USD for use in conversion. Uses env MYR_USD_RATE as fallback if API fails.
 */
export async function getMyrToUsdRateWithFallback(): Promise<number> {
  const fromApi = await getMyrPerUsdRate();
  if (fromApi !== null) return fromApi;
  const fallback = process.env.MYR_USD_RATE;
  const parsed = fallback ? parseFloat(fallback) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 4.45;
}
