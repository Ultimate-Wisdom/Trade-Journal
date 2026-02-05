import Groq from "groq-sdk";

// Initialize Groq
const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

// Cache structure
interface CachedBias {
  data: MarketIntelResponse;
  timestamp: number;
}

interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedDate: string;
  snippet: string;
}

// Response structure
export interface MarketIntelResponse {
  bias: {
    status: "BULLISH" | "BEARISH" | "NEUTRAL";
    summary: string;
    confidence: "High" | "Medium" | "Low";
  };
  articles: any[];
}

// In-memory cache: symbol -> { data, timestamp }
const cache = new Map<string, CachedBias>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds

export async function getForexBias(symbol: string = "EURUSD"): Promise<MarketIntelResponse> {
  try {
    // Normalize symbol
    const normalizedSymbol = symbol.replace("/", "").toUpperCase();

    // Check cache first
    const cached = cache.get(normalizedSymbol);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`📦 Cache hit for ${normalizedSymbol}`);
      return cached.data;
    }

    if (!groq || !process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not set in environment variables");
    }

    console.log(`🌍 Fetching Global Macro news for ${normalizedSymbol} via Google RSS...`);

    // 1. Define Search Queries based on Symbol
    let query = "finance";
    if (normalizedSymbol === "EURUSD") query = "EURUSD+ECB+Federal+Reserve+Forex";
    else if (normalizedSymbol === "GBPUSD") query = "GBPUSD+Bank+of+England+UK+Economy";
    else if (normalizedSymbol === "XAUUSD") query = "Gold+Price+Inflation+USD";
    else if (normalizedSymbol === "BTC") query = "Bitcoin+Crypto+Regulation+SEC";
    else if (normalizedSymbol === "NAS100") query = "Nasdaq+Stock+Market+Tech";
    else query = `${normalizedSymbol}+finance+news`;

    // 2. Fetch Google News RSS (Unlimited & Free)
    const rssUrl = `https://news.google.com/rss/search?q=${query}+when:1d&hl=en-US&gl=US&ceid=US:en`;
    
    let rssResponse;
    let xmlData = "";
    try {
      rssResponse = await fetch(rssUrl);
      if (!rssResponse.ok) {
        throw new Error(`Google News RSS returned ${rssResponse.status}`);
      }
      xmlData = await rssResponse.text();
    } catch (fetchError: any) {
      console.error(`❌ Failed to fetch RSS for ${normalizedSymbol}:`, fetchError.message);
      // Fallback: Try a simpler query
      if (normalizedSymbol === "NAS100") {
        console.log(`🔄 Trying fallback query for NAS100...`);
        const fallbackUrl = `https://news.google.com/rss/search?q=Nasdaq+Stock+Market+when:1d&hl=en-US&gl=US&ceid=US:en`;
        try {
          rssResponse = await fetch(fallbackUrl);
          if (rssResponse.ok) {
            xmlData = await rssResponse.text();
          }
        } catch (fallbackError) {
          console.error(`❌ Fallback query also failed:`, fallbackError);
        }
      }
      
      if (!xmlData) {
        throw new Error(`Failed to fetch news for ${normalizedSymbol}`);
      }
    }

    // 3. Simple XML Parsing (Regex is faster/lighter than adding a parser dep)
    const items: NewsItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const titleRegex = /<title>(.*?)<\/title>/;
    const linkRegex = /<link>(.*?)<\/link>/;
    const dateRegex = /<pubDate>(.*?)<\/pubDate>/;
    const sourceRegex = /<source.*?>([\s\S]*?)<\/source>/;
    
    let match;
    let count = 0;

    // Extract top 10 items
    while ((match = itemRegex.exec(xmlData)) !== null && count < 10) {
      const content = match[1];
      const title = content.match(titleRegex)?.[1] || "No Title";
      const url = content.match(linkRegex)?.[1] || "#";
      const date = content.match(dateRegex)?.[1] || new Date().toISOString();
      const source = content.match(sourceRegex)?.[1] || "Google News";

      // Clean up title (Google adds " - Source" at the end)
      const cleanTitle = title.split(" - ")[0];

      items.push({
        title: cleanTitle,
        url,
        source,
        publishedDate: date,
        snippet: "Click to read full coverage.", // RSS doesn't give snippets, we use title
      });
      count++;
    }

    if (items.length === 0) {
      console.warn(`⚠️ No news items found for ${normalizedSymbol} with query: ${query}`);
      // Return fallback response instead of throwing
      return {
        bias: {
          status: "NEUTRAL",
          summary: `No recent news available for ${normalizedSymbol}. Market data temporarily unavailable.`,
          confidence: "Low",
        },
        articles: [],
      };
    }

    console.log(`✅ Parsed ${items.length} articles. Analyzing with Groq...`);

    // 4. AI Analysis (Llama-3 via Groq)
    const headlines = items.slice(0, 5).map((i) => i.title).join("\n");
    const prompt = `
You are a Wall Street Global Macro Strategist.
Analyze these headlines for ${normalizedSymbol}:
${headlines}

Task:
1. Determine the bias: BULLISH (Price up), BEARISH (Price down), or NEUTRAL (Range).
2. Write a 1-sentence institutional summary explaining the key driver (e.g. "ECB hawkishness," "Safe haven flows").
3. Assign confidence: High/Medium/Low.

Return JSON ONLY:
{
  "status": "BULLISH" | "BEARISH" | "NEUTRAL",
  "summary": "Your summary here.",
  "confidence": "High" | "Medium" | "Low"
}
`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
    });

    const aiResponse = completion.choices[0]?.message?.content || "{}";
    
    // Parse AI response
    let aiResult: {
      status?: "BULLISH" | "BEARISH" | "NEUTRAL";
      summary?: string;
      confidence?: "High" | "Medium" | "Low";
    } = {};

    try {
      // Try to extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResult = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("❌ Failed to parse AI response:", parseError);
    }

    const response: MarketIntelResponse = {
      bias: {
        status: aiResult.status || "NEUTRAL",
        summary: aiResult.summary || "Market is mixed; monitoring key levels.",
        confidence: aiResult.confidence || "Medium",
      },
      articles: items,
    };

    // Cache the response
    cache.set(normalizedSymbol, {
      data: response,
      timestamp: Date.now(),
    });

    console.log(`✅ Market intel generated for ${normalizedSymbol}: ${response.bias.status}`);
    return response;
  } catch (error: any) {
    console.error(`❌ Error fetching macro data:`, error);
    // Fallback data so the dashboard never crashes
    return {
      bias: {
        status: "NEUTRAL",
        summary: "Data unavailable. Check connection.",
        confidence: "Low",
      },
      articles: [],
    };
  }
}

/**
 * Clear cache for a specific symbol or all symbols
 * @param symbol - Optional symbol to clear, or undefined to clear all
 */
export function clearCache(symbol?: string): void {
  if (symbol) {
    const normalizedSymbol = symbol.replace("/", "").toUpperCase();
    cache.delete(normalizedSymbol);
    console.log(`🗑️  Cache cleared for ${normalizedSymbol}`);
  } else {
    cache.clear();
    console.log("🗑️  All cache cleared");
  }
}

/**
 * Get cache statistics (for debugging)
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}
