import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Download, FileText, FileJson, Loader2 } from "lucide-react";
import { downloadTradesCSV, downloadTradesJSON } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";
import type { Trade, Account } from "@shared/types";

interface ExportDialogProps {
  trades: Trade[];
  accounts: Account[];
  trigger?: React.ReactNode;
}

const EXPORT_FIELDS = [
  { id: "date", label: "Date", default: true },
  { id: "account", label: "Account", default: true },
  { id: "symbol", label: "Symbol", default: true },
  { id: "direction", label: "Direction", default: true },
  { id: "entryPrice", label: "Entry Price", default: true },
  { id: "entryTime", label: "Entry Time", default: false },
  { id: "riskPercent", label: "Risk %", default: true },
  { id: "riskRewardRatio", label: "Risk:Reward", default: true },
  { id: "status", label: "Status", default: true },
  { id: "pnl", label: "P&L", default: true },
  { id: "strategy", label: "Strategy", default: true },
  { id: "setup", label: "Setup", default: false },
  { id: "conviction", label: "Conviction", default: false },
  { id: "notes", label: "Notes", default: false },
  { id: "psychology", label: "Psychology", default: false },
  { id: "mistakes", label: "Mistakes", default: false },
  { id: "improvements", label: "Improvements", default: false },
];

export function ExportDialog({ trades, accounts, trigger }: ExportDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>(
    EXPORT_FIELDS.filter(f => f.default).map(f => f.id)
  );
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [dateRange, setDateRange] = useState<"all" | "month" | "week" | "custom">("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [isExporting, setIsExporting] = useState(false);

  const toggleField = (fieldId: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const selectAllFields = () => {
    setSelectedFields(EXPORT_FIELDS.map(f => f.id));
  };

  const selectDefaultFields = () => {
    setSelectedFields(EXPORT_FIELDS.filter(f => f.default).map(f => f.id));
  };

  const filterTradesByDate = (trades: any[]) => {
    if (dateRange === "all") return trades;

    const now = new Date();
    let filterDate: Date;

    switch (dateRange) {
      case "week":
        filterDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case "month":
        filterDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case "custom":
        if (!dateFrom) return trades;
        return trades.filter(t => {
          const tradeDate = new Date(t.createdAt || t.entryDate);
          return tradeDate >= dateFrom && (!dateTo || tradeDate <= dateTo);
        });
      default:
        return trades;
    }

    return trades.filter(t => {
      const tradeDate = new Date(t.createdAt || t.entryDate);
      return tradeDate >= filterDate;
    });
  };

  const filterTradesByFields = (trades: any[]) => {
    // Filter trades to only include selected fields
    return trades.map(trade => {
      const filtered: any = {};
      selectedFields.forEach(fieldId => {
        switch (fieldId) {
          case "date":
            filtered.entryDate = trade.entryDate;
            filtered.createdAt = trade.createdAt;
            break;
          case "account":
            filtered.accountId = trade.accountId;
            break;
          default:
            if (trade[fieldId] !== undefined) {
              filtered[fieldId] = trade[fieldId];
            }
        }
      });
      return filtered;
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let filteredTrades = filterTradesByDate(trades);
      filteredTrades = filterTradesByFields(filteredTrades);

      if (exportFormat === "csv") {
        downloadTradesCSV(filteredTrades, accounts);
      } else {
        downloadTradesJSON(filteredTrades, accounts);
      }

      toast({
        title: "Export Successful",
        description: `Exported ${filteredTrades.length} trades as ${exportFormat.toUpperCase()}`,
      });
      
      setOpen(false);
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export trades",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize Export</DialogTitle>
          <DialogDescription>
            Choose which fields and date range to export
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Export Format */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select value={exportFormat} onValueChange={(v: any) => setExportFormat(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    CSV (Excel Compatible)
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-4 w-4" />
                    JSON (Full Data)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {dateRange === "custom" && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <Label className="text-xs">From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFrom ? format(dateFrom, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-xs">To</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateTo ? format(dateTo, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dateTo} onSelect={setDateTo} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>

          {/* Field Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Fields to Export</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAllFields}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={selectDefaultFields}>
                  Reset
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4 rounded-lg bg-muted/30 max-h-[300px] overflow-y-auto">
              {EXPORT_FIELDS.map((field) => (
                <div key={field.id} className="flex items-center gap-2">
                  <Checkbox
                    id={field.id}
                    checked={selectedFields.includes(field.id)}
                    onCheckedChange={() => toggleField(field.id)}
                  />
                  <Label htmlFor={field.id} className="text-sm cursor-pointer">
                    {field.label}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedFields.length} of {EXPORT_FIELDS.length} fields selected
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || selectedFields.length === 0}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {filterTradesByDate(trades).length} Trades
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
