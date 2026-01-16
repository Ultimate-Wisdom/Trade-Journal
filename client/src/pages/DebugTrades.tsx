import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DebugTrades() {
  const { data: trades } = useQuery({
    queryKey: ["/api/trades"],
  });

  const closedTrades = trades?.filter((t: any) => t.status === "Closed") || [];
  const openTrades = trades?.filter((t: any) => t.status === "Open") || [];
  const tradesWithPNL = trades?.filter((t: any) => t.pnl !== null && t.pnl !== undefined) || [];
  const tradesWithoutPNL = trades?.filter((t: any) => t.pnl === null || t.pnl === undefined) || [];

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Debug: Trades P&L Status</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{trades?.length || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Closed Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{closedTrades.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>With P&L Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{tradesWithPNL.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Without P&L Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{tradesWithoutPNL.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Trades Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {trades?.slice(0, 10).map((trade: any) => (
              <div key={trade.id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{trade.symbol}</p>
                    <p className="text-xs text-muted-foreground">
                      {trade.direction} • {trade.status} • {new Date(trade.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono font-bold ${
                      trade.pnl === null || trade.pnl === undefined
                        ? "text-gray-400"
                        : trade.pnl > 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}>
                      {trade.pnl === null || trade.pnl === undefined
                        ? "No P&L"
                        : `$${trade.pnl.toFixed(2)}`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <h3 className="font-semibold mb-2">💡 How to Fix "$0.0k" Issue:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>For <strong>new trades</strong>: Fill P&L field and click "Save Journal"</li>
          <li>For <strong>existing trades</strong>: Edit them and add P&L value</li>
          <li>P&L should come from your broker statement (exact profit/loss)</li>
          <li>Use positive numbers for profit (+50.00) and negative for loss (-30.00)</li>
        </ol>
      </div>
    </div>
  );
}
