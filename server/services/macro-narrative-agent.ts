import Groq from "groq-sdk";
import { db } from "../db";
import { dailyMacroBias } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

// Initialize Groq
const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

interface Headline {
  title: string;
  source: string;
  url?: string;
  date?: string;
}

interface MacroAnalysisResult {
  sentimentScore: number; // -10 to +10
  narrativeSummary: string; // 2 sentences
  dominantNarrative: "RISK_ON" | "RISK_OFF" | "NEUTRAL";
}

interface CentralBankPolicy {
  bank: string; // "FED", "ECB", "BoE", "BoJ"
  policyScore: number; // -5 to +5
  bias: "Hawkish" | "Neutral" | "Dovish";
  reasoning: string; // AI-generated explanation
}

interface CentralBankPolicyAnalysis {
  FED: CentralBankPolicy;
  ECB: CentralBankPolicy;
  BoE: CentralBankPolicy;
  BoJ: CentralBankPolicy;
}

/**
 * Scrape Forex Factory's Latest Stories (High Impact Only)
 * Note: Forex Factory doesn't have a public API, so we'll use RSS or HTML parsing
 */
async function scrapeForexFactory(): Promise<Headline[]> {
  try {
    // Forex Factory RSS feed for latest news
    const rssUrl = "https://www.forexfactory.com/rss.php";
    
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
    });

    if (!response.ok) {
      console.warn("⚠️ Forex Factory RSS fetch failed:", response.status);
      return [];
    }

    const xmlText = await response.text();
    const headlines: Headline[] = [];

    // Parse RSS XML (simple regex-based parsing)
    // Look for <item> tags with <title> and <link>
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const items = xmlText.match(itemRegex) || [];

    for (const item of items.slice(0, 10)) { // Limit to top 10
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/i);
      const linkMatch = item.match(/<link>(.*?)<\/link>/i);
      
      if (titleMatch) {
        const title = titleMatch[1] || titleMatch[2] || "";
        // Filter for high impact news (keywords: FOMC, ECB, NFP, CPI, GDP, Rate Decision, etc.)
        const highImpactKeywords = [
          "FOMC", "ECB", "NFP", "CPI", "GDP", "Rate Decision", "Interest Rate",
          "Fed", "Federal Reserve", "Central Bank", "Monetary Policy", "Inflation"
        ];
        
        const isHighImpact = highImpactKeywords.some(keyword => 
          title.toUpperCase().includes(keyword.toUpperCase())
        );

        if (isHighImpact || title.length > 0) {
          headlines.push({
            title: title.trim(),
            source: "Forex Factory",
            url: linkMatch ? linkMatch[1].trim() : undefined,
          });
        }
      }
    }

    console.log(`✅ Scraped ${headlines.length} headlines from Forex Factory`);
    return headlines;
  } catch (error) {
    console.error("❌ Error scraping Forex Factory:", error);
    return [];
  }
}

/**
 * Fetch latest press release headlines from Federal Reserve (FOMC)
 */
async function fetchFOMCHeadlines(): Promise<Headline[]> {
  try {
    // Federal Reserve RSS feed for press releases
    const rssUrl = "https://www.federalreserve.gov/feeds/press_all.xml";
    
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
    });

    if (!response.ok) {
      console.warn("⚠️ FOMC RSS fetch failed:", response.status);
      return [];
    }

    const xmlText = await response.text();
    const headlines: Headline[] = [];

    // Parse RSS XML
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const items = xmlText.match(itemRegex) || [];

    for (const item of items.slice(0, 5)) { // Latest 5 press releases
      const titleMatch = item.match(/<title>(.*?)<\/title>/i);
      const linkMatch = item.match(/<link>(.*?)<\/link>/i);
      const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/i);
      
      if (titleMatch) {
        headlines.push({
          title: titleMatch[1].trim(),
          source: "Federal Reserve (FOMC)",
          url: linkMatch ? linkMatch[1].trim() : undefined,
          date: dateMatch ? dateMatch[1].trim() : undefined,
        });
      }
    }

    console.log(`✅ Fetched ${headlines.length} headlines from FOMC`);
    return headlines;
  } catch (error) {
    console.error("❌ Error fetching FOMC headlines:", error);
    return [];
  }
}

/**
 * Fetch latest press release headlines from Bank of England (BoE)
 */
async function fetchBoEHeadlines(): Promise<Headline[]> {
  try {
    // Bank of England RSS feed for press releases
    const rssUrl = "https://www.bankofengland.co.uk/news/rss";
    
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
    });

    if (!response.ok) {
      console.warn("⚠️ BoE RSS fetch failed:", response.status);
      return [];
    }

    const xmlText = await response.text();
    const headlines: Headline[] = [];

    // Parse RSS XML
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const items = xmlText.match(itemRegex) || [];

    for (const item of items.slice(0, 5)) { // Latest 5 press releases
      const titleMatch = item.match(/<title>(.*?)<\/title>/i);
      const linkMatch = item.match(/<link>(.*?)<\/link>/i);
      const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/i);
      
      if (titleMatch) {
        headlines.push({
          title: titleMatch[1].trim(),
          source: "Bank of England (BoE)",
          url: linkMatch ? linkMatch[1].trim() : undefined,
          date: dateMatch ? dateMatch[1].trim() : undefined,
        });
      }
    }

    console.log(`✅ Fetched ${headlines.length} headlines from BoE`);
    return headlines;
  } catch (error) {
    console.error("❌ Error fetching BoE headlines:", error);
    return [];
  }
}

/**
 * Fetch latest press release headlines from Bank of Japan (BoJ)
 */
async function fetchBoJHeadlines(): Promise<Headline[]> {
  try {
    // Bank of Japan RSS feed for press releases
    const rssUrl = "https://www.boj.or.jp/en/announcements/release/index.htm";
    
    // BoJ doesn't have a standard RSS feed, so we'll use Google News as a fallback
    // Search for "Bank of Japan" news
    const googleNewsUrl = "https://news.google.com/rss/search?q=Bank+of+Japan+monetary+policy+OR+interest+rate+OR+BOJ&hl=en&gl=US&ceid=US:en";
    
    const response = await fetch(googleNewsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
    });

    if (!response.ok) {
      console.warn("⚠️ BoJ RSS fetch failed:", response.status);
      return [];
    }

    const xmlText = await response.text();
    const headlines: Headline[] = [];

    // Parse RSS XML
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const items = xmlText.match(itemRegex) || [];

    for (const item of items.slice(0, 5)) { // Latest 5 news items
      const titleMatch = item.match(/<title>(.*?)<\/title>/i);
      const linkMatch = item.match(/<link>(.*?)<\/link>/i);
      const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/i);
      
      if (titleMatch) {
        const title = titleMatch[1].trim();
        // Filter for BoJ-related news
        if (title.toUpperCase().includes("BANK OF JAPAN") || 
            title.toUpperCase().includes("BOJ") ||
            title.toUpperCase().includes("JAPAN CENTRAL BANK")) {
          headlines.push({
            title: title,
            source: "Bank of Japan (BoJ)",
            url: linkMatch ? linkMatch[1].trim() : undefined,
            date: dateMatch ? dateMatch[1].trim() : undefined,
          });
        }
      }
    }

    console.log(`✅ Fetched ${headlines.length} headlines from BoJ`);
    return headlines;
  } catch (error) {
    console.error("❌ Error fetching BoJ headlines:", error);
    return [];
  }
}

/**
 * Fetch latest press release headlines from European Central Bank (ECB)
 */
async function fetchECBHeadlines(): Promise<Headline[]> {
  try {
    // ECB RSS feed for press releases
    const rssUrl = "https://www.ecb.europa.eu/rss/press.html";
    
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
    });

    if (!response.ok) {
      console.warn("⚠️ ECB RSS fetch failed:", response.status);
      return [];
    }

    const xmlText = await response.text();
    const headlines: Headline[] = [];

    // Parse RSS XML
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const items = xmlText.match(itemRegex) || [];

    for (const item of items.slice(0, 5)) { // Latest 5 press releases
      const titleMatch = item.match(/<title>(.*?)<\/title>/i);
      const linkMatch = item.match(/<link>(.*?)<\/link>/i);
      const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/i);
      
      if (titleMatch) {
        headlines.push({
          title: titleMatch[1].trim(),
          source: "European Central Bank (ECB)",
          url: linkMatch ? linkMatch[1].trim() : undefined,
          date: dateMatch ? dateMatch[1].trim() : undefined,
        });
      }
    }

    console.log(`✅ Fetched ${headlines.length} headlines from ECB`);
    return headlines;
  } catch (error) {
    console.error("❌ Error fetching ECB headlines:", error);
    return [];
  }
}

/**
 * Analyze headlines using AI (Groq) to determine market narrative
 */
async function analyzeMacroNarrative(headlines: Headline[]): Promise<MacroAnalysisResult> {
  if (!groq || !process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set in environment variables");
  }

  if (headlines.length === 0) {
    // Return neutral if no headlines
    return {
      sentimentScore: 0,
      narrativeSummary: "No significant macro news available today. Market sentiment remains neutral with no clear directional bias.",
      dominantNarrative: "NEUTRAL",
    };
  }

  // Format headlines for AI prompt
  const headlinesText = headlines
    .map((h, i) => `${i + 1}. [${h.source}] ${h.title}`)
    .join("\n");

  const systemPrompt = `You are a senior macro strategist at a top-tier investment bank. Your task is to analyze financial news headlines and determine the dominant market narrative.

Analyze the provided headlines and output a JSON object with:
1. sentimentScore: A number from -10 (Very Bearish) to +10 (Very Bullish)
2. narrativeSummary: Exactly 2 sentences describing the dominant market narrative
3. dominantNarrative: One of "RISK_ON", "RISK_OFF", or "NEUTRAL"

Guidelines:
- RISK_ON: Positive economic data, dovish central bank signals, strong growth indicators → Positive sentiment (1 to 10)
- RISK_OFF: Negative economic data, hawkish central bank signals, recession fears → Negative sentiment (-1 to -10)
- NEUTRAL: Mixed signals or no clear direction → Sentiment near 0 (-2 to +2)

Be precise and data-driven.`;

  const userPrompt = `Analyze these headlines and determine the dominant market narrative:

${headlinesText}

Output ONLY a valid JSON object with this exact structure:
{
  "sentimentScore": <number between -10 and 10>,
  "narrativeSummary": "<exactly 2 sentences>",
  "dominantNarrative": "<RISK_ON | RISK_OFF | NEUTRAL>"
}`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3, // Lower temperature for more consistent analysis
    });

    const responseText = completion.choices[0]?.message?.content || "";
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonText = responseText.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/g, "");
    }

    const analysis = JSON.parse(jsonText) as MacroAnalysisResult;

    // Validate and clamp sentiment score
    analysis.sentimentScore = Math.max(-10, Math.min(10, Number(analysis.sentimentScore) || 0));

    // Validate narrative
    if (!["RISK_ON", "RISK_OFF", "NEUTRAL"].includes(analysis.dominantNarrative)) {
      analysis.dominantNarrative = "NEUTRAL";
    }

    console.log("✅ AI Analysis Complete:", analysis);
    return analysis;
  } catch (error) {
    console.error("❌ Error in AI analysis:", error);
    // Return neutral fallback
    return {
      sentimentScore: 0,
      narrativeSummary: "Unable to analyze market narrative due to technical error. Market sentiment remains neutral.",
      dominantNarrative: "NEUTRAL",
    };
  }
}

/**
 * Analyze central bank policy from headlines
 * Assigns policy scores (-5 to +5) to each major central bank
 */
async function analyzeCentralBankPolicy(headlines: Headline[]): Promise<CentralBankPolicyAnalysis> {
  if (!groq || !process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set in environment variables");
  }

  // Filter headlines related to central banks
  const centralBankHeadlines = headlines.filter(h => {
    const titleUpper = h.title.toUpperCase();
    return (
      titleUpper.includes("FED") || titleUpper.includes("FEDERAL RESERVE") || titleUpper.includes("FOMC") ||
      titleUpper.includes("ECB") || titleUpper.includes("EUROPEAN CENTRAL BANK") ||
      titleUpper.includes("BOE") || titleUpper.includes("BANK OF ENGLAND") || titleUpper.includes("BOE") ||
      titleUpper.includes("BOJ") || titleUpper.includes("BANK OF JAPAN") ||
      titleUpper.includes("INTEREST RATE") || titleUpper.includes("MONETARY POLICY") ||
      titleUpper.includes("RATE DECISION") || titleUpper.includes("CENTRAL BANK")
    );
  });

  if (centralBankHeadlines.length === 0) {
    // Return neutral for all banks if no relevant headlines
    return {
      FED: { bank: "FED", policyScore: 0, bias: "Neutral", reasoning: "No recent policy signals detected." },
      ECB: { bank: "ECB", policyScore: 0, bias: "Neutral", reasoning: "No recent policy signals detected." },
      BoE: { bank: "BoE", policyScore: 0, bias: "Neutral", reasoning: "No recent policy signals detected." },
      BoJ: { bank: "BoJ", policyScore: 0, bias: "Neutral", reasoning: "No recent policy signals detected." },
    };
  }

  const headlinesText = centralBankHeadlines
    .map((h, i) => `${i + 1}. [${h.source}] ${h.title}`)
    .join("\n");

  const systemPrompt = `You are a central bank policy analyst at a major investment bank. Your task is to analyze financial news headlines and determine the monetary policy stance of major central banks.

For each central bank (FED/USD, ECB/EUR, BoE/GBP, BoJ/JPY), analyze the headlines and assign:
1. policyScore: A number from -5 (Very Dovish/Rate Cuts) to +5 (Very Hawkish/Rate Hikes)
2. bias: One of "Hawkish", "Neutral", or "Dovish"
3. reasoning: A 1-sentence explanation of the policy stance

Policy Keywords:
- Hawkish (Positive scores): "tighten", "hike", "inflation concerns", "higher rates", "restrictive policy", "fight inflation"
- Dovish (Negative scores): "cut", "stimulus", "growth risks", "lower rates", "accommodative policy", "support growth"
- Neutral (Near zero): "maintain", "unchanged", "data-dependent", "wait and see"

Output ONLY a valid JSON object.`;

  const userPrompt = `Analyze these central bank-related headlines and determine the policy stance for each bank:

${headlinesText}

Output ONLY a valid JSON object with this exact structure:
{
  "FED": {
    "bank": "FED",
    "policyScore": <number between -5 and 5>,
    "bias": "<Hawkish | Neutral | Dovish>",
    "reasoning": "<1 sentence explanation>"
  },
  "ECB": {
    "bank": "ECB",
    "policyScore": <number between -5 and 5>,
    "bias": "<Hawkish | Neutral | Dovish>",
    "reasoning": "<1 sentence explanation>"
  },
  "BoE": {
    "bank": "BoE",
    "policyScore": <number between -5 and 5>,
    "bias": "<Hawkish | Neutral | Dovish>",
    "reasoning": "<1 sentence explanation>"
  },
  "BoJ": {
    "bank": "BoJ",
    "policyScore": <number between -5 and 5>,
    "bias": "<Hawkish | Neutral | Dovish>",
    "reasoning": "<1 sentence explanation>"
  }
}`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
    });

    const responseText = completion.choices[0]?.message?.content || "";
    
    // Extract JSON from response
    let jsonText = responseText.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/g, "");
    }

    const analysis = JSON.parse(jsonText) as CentralBankPolicyAnalysis;

    // Validate and clamp policy scores
    const banks: Array<keyof CentralBankPolicyAnalysis> = ["FED", "ECB", "BoE", "BoJ"];
    for (const bank of banks) {
      if (analysis[bank]) {
        analysis[bank].policyScore = Math.max(-5, Math.min(5, Number(analysis[bank].policyScore) || 0));
        
        // Ensure bias matches score
        if (!["Hawkish", "Neutral", "Dovish"].includes(analysis[bank].bias)) {
          if (analysis[bank].policyScore > 1) {
            analysis[bank].bias = "Hawkish";
          } else if (analysis[bank].policyScore < -1) {
            analysis[bank].bias = "Dovish";
          } else {
            analysis[bank].bias = "Neutral";
          }
        }
      } else {
        // Default if bank not in response
        analysis[bank] = {
          bank,
          policyScore: 0,
          bias: "Neutral",
          reasoning: "No policy signals detected for this central bank.",
        };
      }
    }

    console.log("✅ Central Bank Policy Analysis Complete:", analysis);
    return analysis;
  } catch (error) {
    console.error("❌ Error in central bank policy analysis:", error);
    // Return neutral fallback
    return {
      FED: { bank: "FED", policyScore: 0, bias: "Neutral", reasoning: "Unable to analyze policy stance." },
      ECB: { bank: "ECB", policyScore: 0, bias: "Neutral", reasoning: "Unable to analyze policy stance." },
      BoE: { bank: "BoE", policyScore: 0, bias: "Neutral", reasoning: "Unable to analyze policy stance." },
      BoJ: { bank: "BoJ", policyScore: 0, bias: "Neutral", reasoning: "Unable to analyze policy stance." },
    };
  }
}

/**
 * Generate daily macro bias analysis
 * Main function that orchestrates data collection, AI analysis, and database storage
 */
export async function generateDailyMacroBias(): Promise<void> {
  try {
    console.log("🌍 Starting Daily Macro Bias Analysis...");

    // Step 1: Collect headlines from all sources
    const [forexFactoryHeadlines, fomcHeadlines, ecbHeadlines, boeHeadlines, bojHeadlines] = await Promise.all([
      scrapeForexFactory(),
      fetchFOMCHeadlines(),
      fetchECBHeadlines(),
      fetchBoEHeadlines(),
      fetchBoJHeadlines(),
    ]);

    // Combine all headlines
    const allHeadlines = [
      ...forexFactoryHeadlines,
      ...fomcHeadlines,
      ...ecbHeadlines,
      ...boeHeadlines,
      ...bojHeadlines,
    ];

    if (allHeadlines.length === 0) {
      console.warn("⚠️ No headlines collected. Skipping analysis.");
      return;
    }

    console.log(`📰 Collected ${allHeadlines.length} total headlines`);

    // Step 2: Analyze with AI (both macro narrative and central bank policy)
    const [analysis, centralBankPolicy] = await Promise.all([
      analyzeMacroNarrative(allHeadlines),
      analyzeCentralBankPolicy(allHeadlines),
    ]);

    // Step 3: Get today's date (London time - UTC+0 or UTC+1 depending on DST)
    // For simplicity, use UTC date
    const today = new Date();
    const todayDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

    // Step 4: Save to database (upsert - update if exists, insert if new)
    const sourcesJson = JSON.stringify({
      forexFactory: forexFactoryHeadlines,
      fomc: fomcHeadlines,
      ecb: ecbHeadlines,
      boe: boeHeadlines,
      boj: bojHeadlines,
    });

    const centralBankPolicyJson = JSON.stringify(centralBankPolicy);

    // Check if entry exists for today
    const existing = await db
      .select()
      .from(dailyMacroBias)
      .where(sql`DATE(analysis_date) = DATE(${todayDate.toISOString()})`)
      .limit(1);

    if (existing.length > 0) {
      // Update existing entry
      await db
        .update(dailyMacroBias)
        .set({
          sentimentScore: String(analysis.sentimentScore),
          narrativeSummary: analysis.narrativeSummary,
          dominantNarrative: analysis.dominantNarrative,
          sources: sourcesJson,
          centralBankPolicy: centralBankPolicyJson,
          updatedAt: new Date(),
        })
        .where(eq(dailyMacroBias.id, existing[0].id));

      console.log("✅ Updated existing daily macro bias entry");
    } else {
      // Insert new entry
      await db.insert(dailyMacroBias).values({
        analysisDate: todayDate,
        sentimentScore: String(analysis.sentimentScore),
        narrativeSummary: analysis.narrativeSummary,
        dominantNarrative: analysis.dominantNarrative,
        sources: sourcesJson,
        centralBankPolicy: centralBankPolicyJson,
      });

      console.log("✅ Created new daily macro bias entry");
    }

    console.log("🎯 Daily Macro Bias Analysis Complete!");
  } catch (error) {
    console.error("❌ Error generating daily macro bias:", error);
    throw error;
  }
}

/**
 * Get the latest daily macro bias from database
 */
export async function getLatestMacroBias() {
  try {
    const result = await db
      .select()
      .from(dailyMacroBias)
      .orderBy(sql`analysis_date DESC`)
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    // Parse sources and central bank policy JSON
    const bias = result[0];
    let sources = null;
    let centralBankPolicy = null;
    
    if (bias.sources) {
      try {
        sources = JSON.parse(bias.sources);
      } catch (e) {
        // Invalid JSON, keep as null
      }
    }
    
    if (bias.centralBankPolicy) {
      try {
        centralBankPolicy = JSON.parse(bias.centralBankPolicy);
      } catch (e) {
        // Invalid JSON, keep as null
      }
    }

    return {
      ...bias,
      sentimentScore: Number(bias.sentimentScore),
      sources,
      centralBankPolicy,
    };
  } catch (error) {
    console.error("❌ Error fetching latest macro bias:", error);
    return null;
  }
}
