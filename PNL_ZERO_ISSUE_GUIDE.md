# Why PNL Calendar Shows "$0.0k"

## The Issue

The PNL calendar displays **$0.0k** (or $0.00) because **your trades don't have P&L data yet**.

This happens when:
- ✅ Trades were created **before** we added the P&L field
- ✅ Trades are **Open/Draft** status (not closed yet)
- ✅ Trades are **Closed** but P&L field is empty

## How to Check Your Trades

Visit the **Debug Page** to see your trades P&L status:

```
http://localhost:5000/debug
```

This will show you:
- 📊 Total trades count
- 🔵 Closed trades count
- ✅ Trades WITH P&L data
- ❌ Trades WITHOUT P&L data
- 📋 Recent trades detail

## How to Fix

### For New Trades (Going Forward)

When creating **closed trades**:

1. Fill all trade details
2. **Add P&L from your broker** in the P&L field:
   ```
   P&L: 50.00    (profit)
   P&L: -30.00   (loss)
   ```
3. Click **"Save Journal"** (not "Save Draft")

### For Existing Trades

**Option 1: Edit Each Trade**
1. Go to **Trade History** page
2. Click **Edit** button on a trade
3. Add the **P&L value** from your broker
4. Click **"Save Journal"**

**Option 2: Bulk Update (if many trades)**
You can update the database directly, but let's first check using the debug page.

## Understanding P&L Field

### Required for PNL Calendar:
- ✅ **P&L field** must be filled
- ✅ **Status** should be "Closed"
- ✅ **Value** from broker (exact profit/loss)

### Examples:

**Winning Trade:**
```
Symbol: EURUSD
Direction: Long
Entry: 1.0500
P&L: +98.50  ← From broker
Status: Closed
```
✅ Shows as **+$98.50** in calendar (green)

**Losing Trade:**
```
Symbol: GBPUSD
Direction: Short
Entry: 1.2650
P&L: -52.30  ← From broker
Status: Closed
```
✅ Shows as **-$52.30** in calendar (red)

**Open Trade (Draft):**
```
Symbol: XAUUSD
Direction: Long
Entry: 2050.00
P&L: (empty)  ← Not closed yet
Status: Open
```
❌ **Doesn't show** in P&L calendar (not closed)

## Quick Test

1. **Create a test trade:**
   - Symbol: TEST
   - Direction: Long
   - Entry: 1.0000
   - P&L: **100.00**
   - Status: Closed (Save Journal)

2. **Check PNL Calendar:**
   - Should now show **+$100.00** for today
   - Calendar no longer shows "$0.0k"

3. **Delete test trade** if you want

## Common Mistakes

❌ **Leaving P&L empty** on closed trades
✅ Enter exact P&L from broker

❌ **Using "Save Draft"** for closed trades
✅ Use "Save Journal" for closed trades

❌ **Forgetting to add P&L** when editing old trades
✅ Edit and add P&L value

---

## Next Steps

1. **Visit `/debug`** to see your current trades status
2. **Edit trades** that need P&L data
3. **Create new trades** with P&L filled in
4. **Verify calendar** updates with correct P&L

**The calendar will update immediately when trades have P&L data!** 📊✨
