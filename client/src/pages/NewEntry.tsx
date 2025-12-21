import { Sidebar } from "@/components/layout/Sidebar";
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
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-8 max-w-4xl">
          <header className="mb-8">
            <Link href="/">
              <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </div>
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">New Journal Entry</h1>
                <p className="text-muted-foreground">Log a new trade setup or backtest result.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">Draft</Button>
                <Button className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Entry
                </Button>
              </div>
            </div>
          </header>

          <div className="grid gap-6">
            <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Trade Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pair">Pair / Asset</Label>
                    <Input id="pair" placeholder="e.g. EUR/USD" className="font-mono uppercase" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="strategy">Strategy</Label>
                    <Select>
                      <SelectTrigger>
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
                    <Label>Direction</Label>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 border-primary/20 hover:bg-primary/10 hover:text-primary hover:border-primary">Long</Button>
                      <Button variant="outline" className="flex-1 border-destructive/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive">Short</Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Date & Time</Label>
                    <Input id="date" type="datetime-local" className="font-mono" />
                  </div>

                  <Separator className="col-span-2 my-2" />

                  <div className="space-y-2">
                    <Label htmlFor="rrr">Risk:Reward Ratio</Label>
                    <Input id="rrr" type="text" placeholder="e.g. 1:2.5" className="font-mono uppercase" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sl">Stop Loss (%)</Label>
                    <Input id="sl" type="number" placeholder="2.0" className="font-mono border-destructive/30 focus-visible:ring-destructive" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tp">Take Profit (%)</Label>
                    <Input id="tp" type="number" placeholder="5.0" className="font-mono border-profit/30 focus-visible:ring-profit" />
                  </div>
                  <div className="space-y-2">
                    <Label>Exit Type</Label>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 border-primary/20 hover:bg-primary/10 hover:text-primary hover:border-primary">SL Hit</Button>
                      <Button variant="outline" className="flex-1 border-profit/20 hover:bg-profit/10 hover:text-profit hover:border-profit">TP Hit</Button>
                      <Button variant="outline" className="flex-1 border-muted/20 hover:bg-muted/10">Breakeven</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-3">
              <Card className="md:col-span-2 border-sidebar-border bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Analysis & Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="notes" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="notes">Notes</TabsTrigger>
                      <TabsTrigger value="psychology">Psychology</TabsTrigger>
                      <TabsTrigger value="tags">Tags</TabsTrigger>
                    </TabsList>
                    <TabsContent value="notes">
                      <Textarea 
                        placeholder="Describe your rationale for this trade..." 
                        className="min-h-[200px] font-mono text-sm"
                      />
                    </TabsContent>
                    <TabsContent value="psychology">
                      <Textarea 
                        placeholder="How were you feeling entering this trade? FOMO? Confidence?" 
                        className="min-h-[200px]"
                      />
                    </TabsContent>
                    <TabsContent value="tags">
                      <div className="p-4 border border-dashed rounded-md text-center text-muted-foreground text-sm">
                        Add tags like #FOMO, #NewsEvent, #LateEntry
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Screenshots</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <div className="aspect-video w-full rounded-md border border-dashed border-muted-foreground/50 bg-muted/20 flex items-center justify-center flex-col gap-2 cursor-pointer hover:bg-muted/30 transition-colors">
                      <UploadCloud className="h-8 w-8 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Upload Chart</span>
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