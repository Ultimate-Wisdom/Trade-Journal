import { MobileNav } from "@/components/layout/MobileNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, Plus, Star } from "lucide-react";
import { Link, useRoute } from "wouter";
import { useState, useEffect } from "react";
import {
  mockStrategies,
  calculateRRR,
  calculateSLPercent,
  calculateTPPercent,
  mockTrades,
} from "@/lib/mockData";
import { cn } from "@/lib/utils";

export default function NewEntry() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pair, setPair] = useState("");
  const [direction, setDirection] = useState<"Long" | "Short">("Long");
  const [entryPrice, setEntryPrice] = useState("");
  const [slPrice, setSlPrice] = useState("");
  const [tpPrice, setTpPrice] = useState("");
  const [strategy, setStrategy] = useState("");
  const [notes, setNotes] = useState("");
  const [setup, setSetup] = useState("");
  const [conviction, setConviction] = useState(3);
  const [marketRegime, setMarketRegime] = useState("");
  const [psychologyTags, setPsychologyTags] = useState<string[]>([]);
  const [newStrategyOpen, setNewStrategyOpen] = useState(false);
  const [newStrategyName, setNewStrategyName] = useState("");

  const [strategies, setStrategies] = useState<string[]>(mockStrategies as any);

  const [, params] = useRoute("/new-entry/:id");
  const tradeIdToEdit = params?.id;

  const psychologyOptions = [
    "FOMO",
    "Fear",
    "Overconfidence",
    "Revenge Trading",
    "Hesitation",
    "Discipline",
    "Patience",
    "Fatigue",
  ];

  useEffect(() => {
    if (tradeIdToEdit && tradeIdToEdit !== "new") {
      const trade = mockTrades.find((t) => t.id === tradeIdToEdit) as any;
      if (trade) {
        setEditingId(trade.id);
        setPair(trade.pair || trade.symbol || "");
        setDirection(trade.direction);
        setEntryPrice(String(trade.entryPrice));
        setSlPrice(trade.slPrice ? String(trade.slPrice) : "");
        setTpPrice(trade.tpPrice ? String(trade.tpPrice) : "");
        setStrategy(trade.strategy || "");
        setNotes(trade.notes || "");
        setSetup(trade.setup || "");
        setConviction(trade.conviction || 3);
        setMarketRegime(trade.marketRegime || "");
        setPsychologyTags(trade.psychologyTags || []);
      }
    }
  }, [tradeIdToEdit]);

  const entry = parseFloat(entryPrice);
  const sl = parseFloat(slPrice);
  const tp = parseFloat(tpPrice);

  // LOGIC FIX: Passing 'direction' ensures math works for Short trades
  const rrr =
    entry && sl && tp ? calculateRRR(entry, sl, tp, direction) : "0:0";
  const slPercent =
    entry && sl ? calculateSLPercent(entry, sl, direction) : "0";
  const tpPercent =
    entry && tp ? calculateTPPercent(entry, tp, direction) : "0";

  const handleSaveTrade = () => {
    if (!pair || !entryPrice || !slPrice || !tpPrice) {
      alert("Please fill in the required fields");
      return;
    }

    const payload = {
      symbol: pair.toUpperCase(),
      direction,
      entryPrice,
      stopLoss: slPrice,
      takeProfit: tpPrice,
      status: "Open",
      strategy,
      notes,
      setup,
      marketRegime,
      conviction,
      psychologyTags,
      accountId: "1",
    };

    fetch("/api/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(() => alert("Trade saved successfully!"))
      .catch(() => alert("Error saving trade"));
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <MobileNav />
      <main className="flex-1 overflow-y-auto pt-20">
        <div className="container mx-auto px-4 py-6 md:p-8 max-w-4xl">
          <header className="mb-6 md:mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <Link href="/journal">
                <div className="mb-4 flex items-center gap-2 text-xs md:text-sm text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Journal
                </div>
              </Link>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                New Trade Entry
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                Log a new live trading entry.
              </p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button variant="outline" onClick={() => alert("Draft saved")}>
                Draft
              </Button>
              <Button
                className="gap-2 bg-blue-500 hover:bg-blue-600"
                onClick={handleSaveTrade}
              >
                <Save className="h-4 w-4" />
                Save
              </Button>
            </div>
          </header>

          <div className="grid gap-6">
            <Card className="border-sidebar-border bg-card/50">
              <CardHeader>
                <CardTitle className="text-lg">Trade Setup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Pair / Asset</Label>
                    <Input
                      placeholder="E.G. EURUSD"
                      className="uppercase"
                      value={pair}
                      onChange={(e) => setPair(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Strategy</Label>
                    <div className="flex gap-2">
                      <Select value={strategy} onValueChange={setStrategy}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select strategy" />
                        </SelectTrigger>
                        <SelectContent>
                          {strategies.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Dialog
                        open={newStrategyOpen}
                        onOpenChange={setNewStrategyOpen}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Strategy</DialogTitle>
                          </DialogHeader>
                          <div className="py-4 space-y-4">
                            <Input
                              placeholder="Strategy Name"
                              value={newStrategyName}
                              onChange={(e) =>
                                setNewStrategyName(e.target.value)
                              }
                            />
                            <Button
                              className="w-full"
                              onClick={() => {
                                setStrategies([...strategies, newStrategyName]);
                                setStrategy(newStrategyName);
                                setNewStrategyOpen(false);
                              }}
                            >
                              Add
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Direction</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={direction === "Long" ? "default" : "outline"}
                        className={cn(
                          "flex-1",
                          direction === "Long" && "bg-blue-500",
                        )}
                        onClick={() => setDirection("Long")}
                      >
                        Long
                      </Button>
                      <Button
                        variant={direction === "Short" ? "default" : "outline"}
                        className={cn(
                          "flex-1",
                          direction === "Short" && "bg-blue-500",
                        )}
                        onClick={() => setDirection("Short")}
                      >
                        Short
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Entry Price</Label>
                    <Input
                      type="number"
                      step="0.00001"
                      value={entryPrice}
                      onChange={(e) => setEntryPrice(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Stop Loss Price</Label>
                    <Input
                      type="number"
                      step="0.00001"
                      value={slPrice}
                      onChange={(e) => setSlPrice(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Take Profit Price</Label>
                    <Input
                      type="number"
                      step="0.00001"
                      value={tpPrice}
                      onChange={(e) => setTpPrice(e.target.value)}
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-secondary/20 border border-sidebar-border">
                    <p className="text-xs text-muted-foreground mb-1">
                      Risk:Reward Ratio
                    </p>
                    <p className="text-xl font-bold text-blue-400">{rrr}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-muted-foreground mb-1">
                      Stop Loss %
                    </p>
                    <p className="text-xl font-bold text-red-500">
                      {slPercent}%
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-xs text-muted-foreground mb-1">
                      Take Profit %
                    </p>
                    <p className="text-xl font-bold text-green-500">
                      {tpPercent}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-sidebar-border bg-card/50">
              <CardHeader>
                <CardTitle className="text-lg">Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="notes">
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                    <TabsTrigger value="psychology">Psychology</TabsTrigger>
                    <TabsTrigger value="setup">Setup</TabsTrigger>
                  </TabsList>
                  <TabsContent value="notes">
                    <Textarea
                      placeholder="Entry rationale..."
                      className="min-h-[150px]"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </TabsContent>
                  <TabsContent value="psychology" className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {psychologyOptions.map((tag) => (
                        <Button
                          key={tag}
                          variant={
                            psychologyTags.includes(tag) ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() =>
                            setPsychologyTags((prev) =>
                              prev.includes(tag)
                                ? prev.filter((t) => t !== tag)
                                : [...prev, tag],
                            )
                          }
                        >
                          {tag}
                        </Button>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="setup">
                    <Textarea
                      placeholder="Technical setup description..."
                      className="min-h-[150px]"
                      value={setup}
                      onChange={(e) => setSetup(e.target.value)}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
