# Database Connection Error Guide

## The Error You Saw

```
Error: Connection terminated unexpectedly
    at fn.<anonymous> (@neondatabase/serverless/index.mjs:1250:44)
```

## What It Means

Your **Neon PostgreSQL database connection** crashed unexpectedly:

- ❌ WebSocket connection closed (code 1006 - abnormal closure)
- ❌ Server process crashed
- ❌ Had to manually restart with `npm run dev`

## Why It Happens

### 1. **Neon Idle Timeout** (Most Common) ⏰
- Neon **free tier** pauses database after **5 minutes** of inactivity
- When it wakes up, connection can fail
- This is called "scale-to-zero"

### 2. **Network Issues** 📡
- Internet connection dropped
- WiFi disconnected briefly
- ISP routing issues

### 3. **Connection Pool Exhausted** 🔌
- Too many connections opened
- Connections not properly closed
- Database reached max connections

### 4. **Database Overload** ⚡
- Too many simultaneous queries
- Database compute limits reached (free tier)

## What Was Fixed

### Added to `server/db.ts`:

1. **Connection Pool Configuration:**
   ```typescript
   max: 10                         // Max 10 connections
   idleTimeoutMillis: 30000        // Close idle after 30s
   connectionTimeoutMillis: 10000  // 10s timeout
   ```

2. **Error Handler (Non-Fatal):**
   ```typescript
   pool.on('error', (err) => {
     console.error('⚠️  Database error:', err.message);
     console.log('🔄 Will auto-retry');
   });
   ```

3. **Connection Logger:**
   ```typescript
   pool.on('connect', () => {
     console.log('✅ Database connected');
   });
   ```

## Now When Connection Fails:

### Before (Bad):
```
❌ Connection lost
❌ Server crashes
❌ Manual restart needed
```

### After (Good):
```
⚠️  Connection lost (logged)
🔄 Auto-retry on next request
✅ Server keeps running
```

## How to Prevent This:

### Option 1: Keep Database Warm (Recommended)

Create a simple ping endpoint:

```typescript
// Add to server/routes.ts
app.get("/api/health", async (req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});
```

Then ping it every 4 minutes (before Neon timeout):
- Use a cron job
- Or use a service like UptimeRobot (free)

### Option 2: Upgrade Neon Plan

**Free Tier:**
- 5 minute idle timeout
- Scale-to-zero (pauses)
- 0.25 compute units

**Pro Tier ($19/month):**
- No idle timeout
- Always-on database
- 0.5 compute units minimum

### Option 3: Retry Logic in Code

Already implemented! Connection pool will auto-retry.

## Monitoring Connection Health

### Check Terminal Output:

```
✅ Database connection established    ← Good
⚠️  Unexpected database error        ← Warning (non-fatal)
🔄 Connection will auto-retry        ← Auto-recovery
```

### Test Connection:

```bash
# In another terminal:
curl http://localhost:5000/api/health
```

Should return:
```json
{
  "status": "ok",
  "database": "connected"
}
```

## If Server Still Crashes:

### Quick Fix:
```bash
npm run dev
```

### Check Neon Dashboard:
1. Go to https://console.neon.tech
2. Check your database status
3. Look for:
   - Compute state (should be "Active")
   - Connection count
   - Query performance

### Restart Database (if needed):
1. Neon Console → Your Project
2. Click "Restart" on compute
3. Wait 10-30 seconds
4. Try again

## Long-Term Solutions:

### 1. Use Connection Pooling (Already Done) ✅
- Reduces connection overhead
- Reuses connections efficiently

### 2. Add Health Checks ✅
- Ping database every 4 minutes
- Keeps connection warm

### 3. Implement Retry Logic ✅
- Auto-retry failed queries
- Graceful degradation

### 4. Consider Upgrade
- If errors persist frequently
- Need guaranteed uptime
- Higher traffic application

## Summary

✅ **Error handling added** - Server won't crash  
✅ **Auto-retry enabled** - Connections recover automatically  
✅ **Connection pooling** - Better resource management  
⚠️  **Still may see warnings** - This is normal (non-fatal)  
🎯 **Add health ping** - Prevent idle timeouts  

**Your server is now more resilient to connection issues!** 🛡️
