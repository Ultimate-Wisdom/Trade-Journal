import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, UploadCloud } from "lucide-react";
import { Link } from "wouter";

export default function NewEntry() {
  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <Sidebar />
      <MobileNav />
      <main className="flex-1 overflow-y-auto md:pt-0 pt-20">
        <div className="container mx-auto px-4 py-6 md:p-8 max-w-4xl">
          <header className="mb-6 md:mb-8">
            <Link href="/">
              <div className="mb-4 flex items-center gap-2 text-xs md:text-sm text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </div>
            </Link>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">New Journal Entry</h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">Log a new trade setup or backtest result.</p>
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
                <CardTitle className="text-base md:text-lg">Trade Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pair" className="text-xs md:text-sm">Pair / Asset</Label>
                    <Input id="pair" placeholder="e.g. EUR/USD" className="font-mono uppercase h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="strategy" className="text-xs md:text-sm">Strategy</Label>
                    <Select>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select strategy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="breakout">Breakout</SelectItem>
                        <SelectItem value="reversal">Reversal</SelectItem>
                        <SelectItem value="trend">Trend Following</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs md:text-sm">Direction</Label>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 border-primary/20 hover:bg-primary/10 hover:text-primary hover:border-primary h-10">Long</Button>
                      <Button variant="outline" className="flex-1 border-destructive/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive h-10">Short</Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-xs md:text-sm">Date & Time</Label>
                    <Input id="date" type="datetime-local" className="font-mono h-10" />
                  </div>

                  <Separator className="col-span-1 md:col-span-2 my-2" />

                  <div className="space-y-2">
                    <Label htmlFor="rrr" className="text-xs md:text-sm">Risk:Reward Ratio</Label>
                    <Input id="rrr" type="text" placeholder="e.g. 1:2.5" className="font-mono uppercase h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sl" className="text-xs md:text-sm">Stop Loss (%)</Label>
                    <Input id="sl" type="number" placeholder="2.0" className="font-mono border-destructive/30 focus-visible:ring-destructive h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tp" className="text-xs md:text-sm">Take Profit (%)</Label>
                    <Input id="tp" type="number" placeholder="5.0" className="font-mono border-profit/30 focus-visible:ring-profit h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs md:text-sm">Exit Type</Label>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 border-primary/20 hover:bg-primary/10 hover:text-primary hover:border-primary h-10 text-xs">SL Hit</Button>
                      <Button variant="outline" className="flex-1 border-profit/20 hover:bg-profit/10 hover:text-profit hover:border-profit h-10 text-xs">TP Hit</Button>
                      <Button variant="outline" className="flex-1 border-muted/20 hover:bg-muted/10 h-10 text-xs">Breakeven</Button>
                    </div>
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
                  <CardTitle className="text-base md:text-lg">Screenshots</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <div className="aspect-video w-full rounded-md border border-dashed border-muted-foreground/50 bg-muted/20 flex items-center justify-center flex-col gap-2 cursor-pointer hover:bg-muted/30 transition-colors">
                      <UploadCloud className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground text-center px-2">Upload Chart</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="aspect-square rounded-md bg-muted/40"></div>
                      <div className="aspect-square rounded-md bg-muted/40"></div>
                    </div>
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
