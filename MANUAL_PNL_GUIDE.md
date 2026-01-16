# Manual P&L Input Guide

## Simple P&L Entry

The journal entry form now has a **manual P&L input field** where you can directly enter your profit or loss from your broker.

---

## How to Use

### 1. **For Winning Trades (Take Profit Hit)**
Enter a **positive number**:
```
P&L: 100.00
```
✅ This will show in **GREEN** and add to your total profit

### 2. **For Losing Trades (Stop Loss Hit)**
Enter a **negative number**:
```
P&L: -50.00
```
❌ This will show in **RED** and add to your total loss

### 3. **For Breakeven Trades**
Enter a **small negative** (if fees) or **zero**:
```
P&L: -5.00  (swap/commission)
P&L: 0.00   (true breakeven)
```

### 4. **For Partial Profits**
Enter the **actual profit** when closing early:
```
P&L: 30.00  (closed at 50% TP)
```

---

## Examples from Real Trading

### Example 1: EURUSD Long - TP Hit
```
Symbol: EURUSD
Direction: Long
Entry: 1.0500
Stop Loss: 1.0450
Take Profit: 1.0600
Quantity: 10000
P&L: 98.50  ← Copy from broker
```
✅ Shows as **+$98.50** in green

### Example 2: GBPUSD Short - SL Hit
```
Symbol: GBPUSD
Direction: Short
Entry: 1.2650
Stop Loss: 1.2700
Take Profit: 1.2550
Quantity: 10000
P&L: -52.30  ← Copy from broker
```
❌ Shows as **-$52.30** in red

### Example 3: XAUUSD Long - Breakeven + Fees
```
Symbol: XAUUSD
Direction: Long
Entry: 2050.00
Stop Loss: 2040.00
Take Profit: 2070.00
Quantity: 0.5
P&L: -7.50  ← Small loss from swap/commission
```
⚠️ Shows as **-$7.50** in red (breakeven with fees)

---

## Why Manual Input?

✅ **Your broker knows best** - Accounts for leverage, swap, commission  
✅ **No complex calculation** - Just copy-paste from broker statement  
✅ **Works with any pair** - Different leverage, pip values handled by broker  
✅ **Works with any prop firm** - FTMO, The 5%er, etc.  
✅ **Faster workflow** - No need to calculate anything manually  

---

## Color Coding

The P&L field automatically changes color:

| Value | Color | Display |
|-------|-------|---------|
| **Positive** | 🟢 Green | Profit |
| **Negative** | 🔴 Red | Loss |
| **Zero** | ⚫ Default | Breakeven |

---

## Dashboard Integration

Your manually entered P&L will automatically show in:

- ✅ **Trade History** - Individual trade P&L
- ✅ **PNL Calendar** - Daily/monthly totals
- ✅ **Dashboard Stats** - Win rate, profit factor, total P&L
- ✅ **Analytics** - Strategy performance, time-based analysis

---

## Save Modes

### 🟡 Save Draft (Open Trade)
- Leave P&L empty or enter `0`
- Trade still running
- Update later when closed

### 🟢 Save Journal (Closed Trade)
- Enter actual P&L from broker
- Trade closed (TP/SL/BE hit)
- Will show in all analytics

---

## Entry Time Format

The **Entry Time** field uses **24-hour format**:

```
14:30 = 2:30 PM
09:15 = 9:15 AM
23:45 = 11:45 PM
00:30 = 12:30 AM
```

This helps track which trading session gives you the best results!

## Tips

1. **Check your broker statement** for exact P&L
2. **Include all fees** in your P&L number
3. **Use negative sign** for losses (e.g., `-50.00`)
4. **No need to calculate** - broker does it for you
5. **Update drafts** when trades close
6. **Entry time uses 24h format** (e.g., 14:30, not 2:30 PM)

---

**Simple, accurate, and fast!** 🎯
