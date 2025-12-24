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
import { ArrowLeft, Save, Plus } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { mockStrategies, calculateRRR, calculateSLPercent, calculateTPPercent } from "@/lib/mockData";

export default function NewEntry() {
  const [direction, setDirection] = useState<"Long" | "Short">("Long");
  const [entryPrice, setEntryPrice] = useState("");
  const [slPrice, setSlPrice] = useState("");
  const [tpPrice, setTpPrice] = useState("");
  const [strategy, setStrategy] = useState("");
  const [newStrategyOpen, setNewStrategyOpen] = useState(false);
  const [newStrategyName, setNewStrategyName] = useState("");
  const [strategies, setStrategies] = useState(mockStrategies);

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
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">New Trade Entry</h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">Log a new journal or backtest trade.</p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Button variant="outline" className="flex-1 md:flex-none h-10">Draft</Button>
                <Button className="flex-1 md:flex-none gap-2 h-10">
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
                    <Input id="pair" placeholder="e.g. EUR/USD, BTC, NVDA" className="font-mono uppercase h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs md:text-sm">Strategy</Label>
                    <div className="flex gap-2">
                      <Select value={strategy} onValueChange={setStrategy}>
                        <SelectTrigger className="h-10 flex-1">
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
                      >
                        Long
                      </Button>
                      <Button
                        variant={direction === "Short" ? "default" : "outline"}
                        className="flex-1 h-10"
                        onClick={() => setDirection("Short")}
                      >
                        Short
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-xs md:text-sm">Date & Time</Label>
                    <Input id="date" type="datetime-local" className="font-mono h-10" />
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

            <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-3">
              <Card className="md:col-span-2 border-sidebar-border bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-3 md:pb-6">
                  <CardTitle className="text-base md:text-lg">Analysis & Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="notes" className="w-full">
                    <TabsList className="mb-4 grid w-full grid-cols-3">
                      <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
                      <TabsTrigger value="psychology" className="text-xs">Psychology</TabsTrigger>
                      <TabsTrigger value="tags" className="text-xs">Tags</TabsTrigger>
                    </TabsList>
                    <TabsContent value="notes">
                      <Textarea
                        placeholder="Describe your rationale for this trade..."
                        className="min-h-[200px] font-mono text-xs md:text-sm"
                      />
                    </TabsContent>
                    <TabsContent value="psychology">
                      <Textarea
                        placeholder="How were you feeling entering this trade? FOMO? Confidence?"
                        className="min-h-[200px] text-xs md:text-sm"
                      />
                    </TabsContent>
                    <TabsContent value="tags">
                      <div className="p-4 border border-dashed rounded-md text-center text-muted-foreground text-xs md:text-sm">
                        Add tags like #FOMO, #NewsEvent, #LateEntry
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-3 md:pb-6">
                  <CardTitle className="text-base md:text-lg">Trade Type</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">Select entry type:</p>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" className="justify-start h-10 text-xs">
                      📔 Journal Entry
                    </Button>
                    <Button variant="outline" className="justify-start h-10 text-xs">
                      📊 Backtest Entry
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
