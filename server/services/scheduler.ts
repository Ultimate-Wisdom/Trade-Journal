import { generateDailyMacroBias } from "./macro-narrative-agent";
import { processCOTData } from "./cot-service";

/**
 * Schedule daily macro bias generation at 6:00 AM London Time
 * London Time = UTC+0 (winter) or UTC+1 (summer/DST)
 * For simplicity, we'll use UTC+1 (6 AM London = 5 AM UTC in winter, 6 AM UTC in summer)
 * We'll schedule for 6:00 UTC which covers both cases reasonably
 */
export function startMacroBiasScheduler() {
  // Check if we're in a Node.js environment with setInterval
  if (typeof setInterval === "undefined") {
    console.warn("⚠️ Scheduler not available in this environment");
    return;
  }

  console.log("⏰ Macro Bias Scheduler initialized");

  // Function to check if it's time to run (6:00 AM London Time ≈ 6:00 UTC)
  const checkAndRun = async () => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();

    // Run at 6:00 UTC (approximately 6:00 AM London Time, accounting for DST)
    // Also allow manual trigger at any time during development
    const shouldRun = 
      (utcHour === 6 && utcMinute === 0) || 
      process.env.FORCE_MACRO_BIAS === "true";

    if (shouldRun) {
      console.log("🔄 Scheduled macro bias generation triggered");
      try {
        await generateDailyMacroBias();
        console.log("✅ Scheduled macro bias generation completed");
      } catch (error) {
        console.error("❌ Scheduled macro bias generation failed:", error);
      }
    }
  };

  // Check every minute
  setInterval(checkAndRun, 60 * 1000);

  // Run immediately on startup if it's the right time (for testing)
  checkAndRun();

  console.log("✅ Macro Bias Scheduler started (checks every minute for 6:00 AM UTC)");
}

/**
 * Alternative: Use a more precise cron-like scheduler
 * This requires installing 'node-cron' package: npm install node-cron @types/node-cron
 */
export async function startMacroBiasSchedulerCron() {
  try {
    // Dynamic import for ESM compatibility
    const cron = await import("node-cron");
    
    // Schedule for 6:00 AM UTC (approximately 6:00 AM London Time)
    // Format: minute hour day month dayOfWeek
    // "0 6 * * *" = Every day at 6:00 AM UTC
    cron.default.schedule("0 6 * * *", async () => {
      console.log("🔄 Cron: Scheduled macro bias generation triggered");
      try {
        await generateDailyMacroBias();
        console.log("✅ Cron: Scheduled macro bias generation completed");
      } catch (error) {
        console.error("❌ Cron: Scheduled macro bias generation failed:", error);
      }
    }, {
      timezone: "UTC",
    });

    console.log("✅ Macro Bias Cron Scheduler started (runs daily at 6:00 AM UTC)");
  } catch (error) {
    console.warn("⚠️ node-cron not available, falling back to interval-based scheduler");
    console.warn("   Install with: npm install node-cron @types/node-cron");
    startMacroBiasScheduler(); // Fallback to interval-based
  }
}

/**
 * Schedule COT data processing every Friday at 4:00 PM Eastern Time
 * Eastern Time = UTC-5 (EST) or UTC-4 (EDT)
 * 4:00 PM ET = 9:00 PM UTC (EST) or 8:00 PM UTC (EDT)
 * We'll use 8:30 PM UTC as a compromise (approximately 4:00 PM ET)
 */
export function startCOTScheduler() {
  // Check if we're in a Node.js environment with setInterval
  if (typeof setInterval === "undefined") {
    console.warn("⚠️ COT Scheduler not available in this environment");
    return;
  }

  console.log("⏰ COT Scheduler initialized");

  // Function to check if it's time to run (Friday at 4:00 PM ET ≈ 8:30 PM UTC)
  const checkAndRun = async () => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();
    const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 5 = Friday

    // Run on Friday (day 5) at 8:30 PM UTC (approximately 4:00 PM ET)
    // Also allow manual trigger during development
    const shouldRun = 
      (dayOfWeek === 5 && utcHour === 20 && utcMinute >= 30 && utcMinute < 35) || 
      process.env.FORCE_COT_PROCESS === "true";

    if (shouldRun) {
      console.log("🔄 Scheduled COT data processing triggered");
      try {
        await processCOTData();
        console.log("✅ Scheduled COT data processing completed");
      } catch (error) {
        console.error("❌ Scheduled COT data processing failed:", error);
      }
    }
  };

  // Check every 5 minutes
  setInterval(checkAndRun, 5 * 60 * 1000);

  // Run immediately on startup if it's the right time (for testing)
  checkAndRun();

  console.log("✅ COT Scheduler started (checks every 5 minutes for Friday 8:30 PM UTC)");
}

/**
 * Alternative: Use cron for COT scheduler
 */
export async function startCOTSchedulerCron() {
  try {
    // Dynamic import for ESM compatibility
    const cron = await import("node-cron");
    
    // Schedule for Friday at 8:30 PM UTC (approximately 4:00 PM ET)
    // Format: minute hour day month dayOfWeek
    // "30 20 * * 5" = Every Friday at 8:30 PM UTC
    cron.default.schedule("30 20 * * 5", async () => {
      console.log("🔄 Cron: Scheduled COT data processing triggered");
      try {
        await processCOTData();
        console.log("✅ Cron: Scheduled COT data processing completed");
      } catch (error) {
        console.error("❌ Cron: Scheduled COT data processing failed:", error);
      }
    }, {
      timezone: "UTC",
    });

    console.log("✅ COT Cron Scheduler started (runs every Friday at 8:30 PM UTC / 4:00 PM ET)");
  } catch (error) {
    console.warn("⚠️ node-cron not available for COT, falling back to interval-based scheduler");
    startCOTScheduler(); // Fallback to interval-based
  }
}
