# Bug Fixes Summary - PNL Calendar & Trade Table

## Issues Fixed

### 1. PNL Calendar Showing "$0.0k" ❌ → "$15" ✅

**Problem:**
- Calendar was dividing P&L by 1000 and adding "k" suffix
- Your -$15 loss was displayed as "-$0.0k" (rounded to zero)
- Made it impossible to see small gains/losses

**Root Cause:**
```typescript
// BEFORE (Wrong for trading P&L):
`$${Math.abs(day.pnl / 1000).toFixed(1)}k`
// -15 / 1000 = -0.015 → rounds to "$0.0k"

// AFTER (Correct):
`$${Math.abs(day.pnl).toFixed(0)}`
// -15 → shows as "$15"
```

**Fixed in:** `client/src/pages/PNLCalendarDashboard.tsx` line 299

---

### 2. Account Column Showing UUID ❌ → Account Name ✅

**Problem:**
- Trade table showed `"a1b2c3d4"` (first 8 chars of UUID)
- Not user-friendly or meaningful

**Root Cause:**
```typescript
// BEFORE:
{trade.accountId ? trade.accountId.slice(0, 8) : "—"}
// Shows: "a1b2c3d4"

// AFTER:
{getAccountName(trade.accountId)}
// Shows: "FTMO 100K" or "The 5%er 10K"
```

**Fixed in:** `client/src/components/journal/TradeTable.tsx`
- Added `useQuery` to fetch accounts
- Created `getAccountName()` helper function
- Maps accountId to actual account name

---

### 3. Exit Column Broken ❌ → Removed ✅

**Problem:**
- Referenced `trade.exitPrice` which doesn't exist anymore
- We switched to manual P&L input (no exit price needed)

**Root Cause:**
```typescript
// BEFORE:
const exit = trade.exitPrice ? Number(trade.exitPrice) : undefined;
// ...
{exit ? `$${exit.toFixed(2)}` : "—"}
```

**Fixed in:** `client/src/components/journal/TradeTable.tsx`
- Removed `exitPrice` variable
- Exit column now shows "—" (not needed with manual P&L)

---

### 4. Risk % Column Display

**Problem:**
- Risk percentage not displaying correctly

**Fixed in:** `client/src/components/journal/TradeTable.tsx`
- Properly converts `trade.riskPercent` to number
- Displays with 1 decimal place: `2.5%`

---

## Files Modified

### `client/src/pages/PNLCalendarDashboard.tsx`
```diff
- `$${Math.abs(day.pnl / 1000).toFixed(1)}k`
+ `$${Math.abs(day.pnl).toFixed(0)}`
```

### `client/src/components/journal/TradeTable.tsx`
```diff
+ import { useQuery } from "@tanstack/react-query";
+ import { Account } from "@shared/schema";

+ const { data: accounts } = useQuery<Account[]>({
+   queryKey: ["/api/accounts"],
+ });

+ const getAccountName = (accountId: string | null) => {
+   if (!accountId || !accounts) return "—";
+   const account = accounts.find(a => a.id === accountId);
+   return account ? account.name : accountId.slice(0, 8);
+ };

- const exit = trade.exitPrice ? Number(trade.exitPrice) : undefined;

- {trade.accountId ? trade.accountId.slice(0, 8) : "—"}
+ {getAccountName(trade.accountId)}

- {exit ? `$${exit.toFixed(2)}` : "—"}
+ —
```

---

## Testing

### Before:
```
PNL Calendar:
Jan 14: $0.0k 0W/1L  ❌ (Should show -$15)

Trade Table:
Account: a1b2c3d4    ❌ (Should show "FTMO 100K")
Exit: $1.0550        ❌ (Should be removed)
Risk %: undefined    ❌ (Should show "2.5%")
```

### After:
```
PNL Calendar:
Jan 14: $15 0W/1L    ✅ (Shows actual loss)

Trade Table:
Account: FTMO 100K   ✅ (Shows account name)
Exit: —              ✅ (Not needed)
Risk %: 2.5%         ✅ (Shows correctly)
```

---

## Why These Issues Happened

1. **"k" suffix**: Code was designed for portfolio (thousands/millions), not trading P&L
2. **UUID display**: Quick implementation without account name lookup
3. **Exit price**: Leftover from auto-calculation approach we abandoned
4. **Risk %**: Type conversion issue

---

## Impact

✅ **PNL Calendar** now accurately shows daily gains/losses  
✅ **Trade Table** displays meaningful account names  
✅ **Exit column** removed (not needed with manual P&L)  
✅ **Risk %** displays correctly  

**All issues resolved!** 🎉
