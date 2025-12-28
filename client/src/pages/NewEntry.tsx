import { MobileNav } from "@/components/layout/MobileNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, Plus, Star } from "lucide-react";
import { Link, useRoute } from "wouter";
import { useState, useEffect } from "react";
import { mockStrategies, calculateRRR, calculateSLPercent, calculateTPPercent, mockTrades } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export default function NewEntry() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pair, setPair] = useState("");
  const [direction, setDirection] = useState<"Long" | "Short">("Long");
  const [entryPrice, setEntryPrice] = useState("");
  const [slPrice, setSlPrice] = useState("");
  const [tpPrice, setTpPrice] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [strategy, setStrategy] = useState("");
  const [notes, setNotes] = useState("");
  const [setup, setSetup] = useState("");
  const [conviction, setConviction] = useState(3);
  const [marketRegime, setMarketRegime] = useState("");
  const [psychologyTags, setPsychologyTags] = useState<string[]>([]);
  const [executionMistakes, setExecutionMistakes] = useState<string[]>([]);
  const [newStrategyOpen, setNewStrategyOpen] = useState(false);
  const [newStrategyName, setNewStrategyName] = useState("");
  const [strategies, setStrategies] = useState(mockStrategies);
  const [, params] = useRoute("/new-entry/:id");
  const tradeIdToEdit = params?.id;

  const psychologyOptions = ["FOMO", "Fear", "Overconfidence", "Revenge Trading", "Hesitation", "Discipline", "Patience", "Fatigue"];
  const executionOptions = ["Late Entry", "Early Entry", "Early Exit", "Late Exit", "Missed Trade", "Overtrading", "Rule Violation", "Position Size Error"];

  useEffect(() => {
    if (tradeIdToEdit && tradeIdToEdit !== "new") {
      const trade = mockTrades.find(t => t.id === tradeIdToEdit);
      if (trade) {
        setEditingId(trade.id);
        setPair(trade.pair);
        setDirection(trade.direction);
        setEntryPrice(String(trade.entryPrice));
        setSlPrice(String(trade.slPrice));
        setTpPrice(String(trade.tpPrice));
        setExitPrice(trade.exitPrice ? String(trade.exitPrice) : "");
        setStrategy(trade.strategy);
        setNotes(trade.notes || "");
        setSetup(trade.setup || "");
        setConviction(trade.conviction || 3);
        setMarketRegime(trade.marketRegime || "");
        setPsychologyTags(trade.psychologyTags || []);
        setExecutionMistakes(trade.executionMistakes || []);
      }
    }
  }, [tradeIdToEdit]);

  const entry = parseFloat(entryPrice);
  const sl = parseFloat(slPrice);
  const tp = parseFloat(tpPrice);

  const rrr = entry && sl && tp ? calculateRRR(entry, sl, tp, direction) : "0:0";
  const slPercent = entry && sl ? calculateSLPercent(entry, sl, direction).toFixed(2) : "0";
  const tpPercent = entry && tp ? calculateTPPercent(entry, tp, direction).toFixed(2) : "0";

  const handleAddStrategy = () => {
    if (newStrategyName.trim()) {
      const newStrat = {
        id: String(strategies.length + 1),
        name: newStrategyName,
      };
      setStrategies([...strategies, newStrat]);
      setStrategy(newStrat.id);
      setNewStrategyName("");
      setNewStrategyOpen(false);
    }
  };

  const togglePsychologyTag = (tag: string) => {
    setPsychologyTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const toggleExecutionMistake = (mistake: string) => {
    setExecutionMistakes(prev =>
      prev.includes(mistake) ? prev.filter(m => m !== mistake) : [...prev, mistake]
    );
  };

  const handleSaveDraft = () => {
    console.log("Draft saved:", {
      pair, direction, entryPrice, slPrice, tpPrice, strategy,
      conviction, marketRegime, setup, psychologyTags, executionMistakes, notes
    });
    alert("Trade saved as Draft! You can find it in your Journal with a Draft badge.");
  };

  const handleSaveTrade = () => {
    if (!exitPrice) {
      alert("Please enter exit price to save the trade as completed.");
      return;
    }
    console.log("Trade saved:", {
      pair, direction, entryPrice, slPrice, tpPrice, exitPrice, strategy,
      conviction, marketRegime, setup, psychologyTags, executionMistakes, notes
    });
    alert("Trade saved successfully!");
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <MobileNav />
      <main className="flex-1 overflow-y-auto pt-20">
        <div className="container mx-auto px-4 py-6 md:p-8 max-w-4xl">
          <header className="mb-6 md:mb-8">
            <Link href="/journal">
              <div className="mb-4 flex items-center gap-2 text-xs md:text-sm text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Back to Journal
              </div>
            </Link>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  {editingId ? "Edit Trade" : "New Trade Entry"}
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  {editingId ? "Update your trade details." : "Log a new live trading entry."}
                </p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Button 
                  variant="outline" 
                  className="flex-1 md:flex-none h-10"
                  onClick={handleSaveDraft}
                  data-testid="button-save-draft"
                >
                  Draft
                </Button>
                <Button 
                  className="flex-1 md:flex-none gap-2 h-10"
                  onClick={handleSaveTrade}
                  data-testid="button-save-trade"
                >
                  <Save className="h-4 w-4" />
                  <span className="hidden sm:inline">Save</span>
                </Button>
              </div>
            </div>
          </header>

          <div className="grid gap-4 md:gap-6">
            <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3 md:pb-6">
                <CardTitle className="text-base md:text-lg">Trade Setup</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pair" className="text-xs md:text-sm">Pair / Asset</Label>
                    <Input 
                      id="pair" 
                      placeholder="e.g. EUR/USD, BTC, NVDA" 
                      className="font-mono uppercase h-10"
                      value={pair}
                      onChange={(e) => setPair(e.target.value)}
                      data-testid="input-pair"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs md:text-sm">Strategy</Label>
                    <div className="flex gap-2">
                      <Select value={strategy} onValueChange={setStrategy}>
                        <SelectTrigger className="h-10 flex-1" data-testid="select-strategy">
                          <SelectValue placeholder="Select strategy" />
                        </SelectTrigger>
                        <SelectContent>
                          {strategies.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Dialog open={newStrategyOpen} onOpenChange={setNewStrategyOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="px-3 h-10">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[300px]">
                          <DialogHeader>
                            <DialogTitle>Create Strategy</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Input
                              placeholder="Strategy name"
                              value={newStrategyName}
                              onChange={(e) => setNewStrategyName(e.target.value)}
                              className="h-10"
                            />
                            <Button onClick={handleAddStrategy} className="w-full">
                              Create
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs md:text-sm">Direction</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={direction === "Long" ? "default" : "outline"}
                        className="flex-1 h-10"
                        onClick={() => setDirection("Long")}
                        data-testid="button-long"
                      >
                        Long
                      </Button>
                      <Button
                        variant={direction === "Short" ? "default" : "outline"}
                        className="flex-1 h-10"
                        onClick={() => setDirection("Short")}
                        data-testid="button-short"
                      >
                        Short
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-xs md:text-sm">Date & Time</Label>
                    <Input id="date" type="datetime-local" className="font-mono h-10" data-testid="input-date" />
                  </div>

                  <Separator className="col-span-1 md:col-span-2 my-2" />

                  <div className="space-y-2">
                    <Label htmlFor="entry" className="text-xs md:text-sm">Entry Price</Label>
                    <Input
                      id="entry"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={entryPrice}
                      onChange={(e) => setEntryPrice(e.target.value)}
                      className="font-mono h-10"
                      data-testid="input-entry-price"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sl" className="text-xs md:text-sm border-destructive">
                      Stop Loss Price
                    </Label>
                    <Input
                      id="sl"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={slPrice}
                      onChange={(e) => setSlPrice(e.target.value)}
                      className="font-mono h-10 border-destructive/30 focus-visible:ring-destructive"
                      data-testid="input-sl-price"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tp" className="text-xs md:text-sm">
                      Take Profit Price
                    </Label>
                    <Input
                      id="tp"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={tpPrice}
                      onChange={(e) => setTpPrice(e.target.value)}
                      className="font-mono h-10 border-profit/30 focus-visible:ring-profit"
                      data-testid="input-tp-price"
                    />
                  </div>

                  <Separator className="col-span-1 md:col-span-2 my-2" />

                  <div className="p-3 rounded-lg bg-sidebar-accent/30 border border-sidebar-border">
                    <p className="text-xs text-muted-foreground mb-1">Risk:Reward Ratio</p>
                    <p className="text-lg font-mono font-bold text-primary">{rrr}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                    <p className="text-xs text-muted-foreground mb-1">Stop Loss %</p>
                    <p className="text-lg font-mono font-bold text-destructive">{slPercent}%</p>
                  </div>

                  <div className="p-3 rounded-lg bg-profit/10 border border-profit/30">
                    <p className="text-xs text-muted-foreground mb-1">Take Profit %</p>
                    <p className="text-lg font-mono font-bold text-profit">{tpPercent}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {editingId && (
              <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm border-profit/30">
                <CardHeader className="pb-3 md:pb-6">
                  <CardTitle className="text-base md:text-lg">Exit Details (Draft Completion)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="exit" className="text-xs md:text-sm">Exit Price</Label>
                      <Input
                        id="exit"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={exitPrice}
                        onChange={(e) => setExitPrice(e.target.value)}
                        className="font-mono h-10 border-profit/30"
                        data-testid="input-exit-price"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3 md:pb-6">
                <CardTitle className="text-base md:text-lg">Analysis & Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="notes" className="w-full">
                  <TabsList className="mb-4 grid w-full grid-cols-4">
                    <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
                    <TabsTrigger value="psychology" className="text-xs">Psychology</TabsTrigger>
                    <TabsTrigger value="tags" className="text-xs">Tags</TabsTrigger>
                    <TabsTrigger value="setup" className="text-xs">Setup</TabsTrigger>
                  </TabsList>

                  <TabsContent value="notes">
                    <Textarea
                      placeholder="Describe your rationale for this trade..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="min-h-[200px] font-mono text-xs md:text-sm"
                      data-testid="textarea-notes"
                    />
                  </TabsContent>

                  <TabsContent value="psychology" className="space-y-4">
                    <div className="space-y-3">
                      <p className="text-sm font-semibold">Behavioral State</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {psychologyOptions.map((tag) => (
                          <Button
                            key={tag}
                            variant={psychologyTags.includes(tag) ? "default" : "outline"}
                            size="sm"
                            onClick={() => togglePsychologyTag(tag)}
                            className="text-xs h-8"
                            data-testid={`button-psychology-${tag.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            {tag}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <p className="text-sm font-semibold">Execution Mistakes</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {executionOptions.map((mistake) => (
                          <Button
                            key={mistake}
                            variant={executionMistakes.includes(mistake) ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleExecutionMistake(mistake)}
                            className="text-xs h-8"
                            data-testid={`button-execution-${mistake.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            {mistake}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="tags" className="space-y-4">
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Conviction Level</Label>
                      <div className="flex gap-2 items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setConviction(star)}
                            className={cn(
                              "p-2 rounded-md transition-colors",
                              conviction >= star
                                ? "bg-yellow-500/30 text-yellow-500"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            )}
                            data-testid={`button-conviction-${star}`}
                          >
                            <Star className="h-5 w-5" fill={conviction >= star ? "currentColor" : "none"} />
                          </button>
                        ))}
                        <span className="ml-2 text-sm text-muted-foreground">{conviction}/5</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label htmlFor="regime" className="text-sm font-semibold">Market Regime</Label>
                      <Select value={marketRegime} onValueChange={setMarketRegime}>
                        <SelectTrigger id="regime" className="h-10" data-testid="select-market-regime">
                          <SelectValue placeholder="Select market regime" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Clear Uptrend">Clear Uptrend</SelectItem>
                          <SelectItem value="Clear Downtrend">Clear Downtrend</SelectItem>
                          <SelectItem value="Sideways">Sideways</SelectItem>
                          <SelectItem value="Volatile">Volatile</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>

                  <TabsContent value="setup">
                    <Textarea
                      placeholder="Describe the setup that triggered this trade..."
                      value={setup}
                      onChange={(e) => setSetup(e.target.value)}
                      className="min-h-[200px] text-xs md:text-sm"
                      data-testid="textarea-setup"
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
