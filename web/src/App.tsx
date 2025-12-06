import { FormEvent, useState } from 'react';

type AnalysisResponse = {
  product: {
    id: string;
    title: string;
    sourceUrl: string;
    buyPrice: number;
    currency: string;
  };
  marketSnapshot: {
    avgSoldPrice: number;
    minSoldPrice: number;
    maxSoldPrice: number;
    numSales: number;
    currency: string;
  };
  profitEstimate: {
    estimatedProfitPerItem: number;
    profitMarginPercent: number;
    assumptions: {
      ebayFeeRate: number;
      paymentProcessingRate: number;
      shippingCost: number;
      otherFees: number;
    };
  };
  listings: { title: string; price: number; currency: string; soldAt: string }[];
};

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-4 shadow-sm">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="text-2xl font-semibold text-slate-100">{value}</p>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

function ListingTable({ listings }: { listings: AnalysisResponse['listings'] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800/60">
      <table className="w-full text-sm text-left text-slate-200">
        <thead className="bg-slate-900/60 text-slate-400 uppercase text-xs">
          <tr>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Sold price</th>
            <th className="px-4 py-3">Sold at</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((listing) => (
            <tr key={`${listing.title}-${listing.soldAt}`} className="border-t border-slate-700/60">
              <td className="px-4 py-3">{listing.title}</td>
              <td className="px-4 py-3 font-semibold">{`${listing.currency} ${listing.price.toFixed(2)}`}</td>
              <td className="px-4 py-3 text-slate-400">{new Date(listing.soldAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function App() {
  const [sourceUrl, setSourceUrl] = useState('');
  const [buyPrice, setBuyPrice] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [keywordOverride, setKeywordOverride] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setAnalysis(null);
    try {
      const response = await fetch(`${API_BASE}/api/products/analyse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceUrl,
          buyPrice: Number(buyPrice),
          currency,
          keywordOverride: keywordOverride || undefined,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Unable to analyse');
      }
      const data: AnalysisResponse = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-indigo-300 font-semibold">FlipFinder</p>
            <h1 className="text-3xl font-bold">Validate your AliExpress flips with live eBay comps</h1>
            <p className="text-slate-400 mt-1">Paste a product URL and we will fetch recent sold prices to estimate profit.</p>
          </div>
          <div className="rounded-full bg-indigo-500/10 text-indigo-200 px-4 py-2 border border-indigo-500/30 text-sm">
            Beta
          </div>
        </header>

        <form onSubmit={handleSubmit} className="grid gap-4 rounded-xl bg-slate-900/60 p-5 border border-slate-800 shadow">
          <div className="grid gap-2">
            <label className="text-sm text-slate-300">AliExpress product URL</label>
            <input
              required
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://www.aliexpress.com/item/..."
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="grid gap-2">
              <label className="text-sm text-slate-300">Buy price</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={buyPrice}
                onChange={(e) => setBuyPrice(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-slate-300">Currency</label>
              <input
                required
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 uppercase focus:border-indigo-400 focus:outline-none"
                maxLength={3}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-slate-300">Keyword override (optional)</label>
              <input
                type="text"
                value={keywordOverride}
                onChange={(e) => setKeywordOverride(e.target.value)}
                placeholder="e.g. wireless earbuds"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-400">We estimate profit using recent sold comps and standard marketplace fees.</p>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex justify-center items-center rounded-lg bg-indigo-500 px-4 py-2 font-semibold text-white shadow hover:bg-indigo-600 disabled:opacity-70"
            >
              {loading ? 'Analysing...' : 'Analyse product'}
            </button>
          </div>
          {error && <p className="text-rose-300 text-sm">{error}</p>}
        </form>

        {analysis && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard label="Avg sold" value={`${analysis.marketSnapshot.currency} ${analysis.marketSnapshot.avgSoldPrice.toFixed(2)}`} />
              <StatCard label="Min sold" value={`${analysis.marketSnapshot.currency} ${analysis.marketSnapshot.minSoldPrice.toFixed(2)}`} />
              <StatCard label="Max sold" value={`${analysis.marketSnapshot.currency} ${analysis.marketSnapshot.maxSoldPrice.toFixed(2)}`} />
              <StatCard label="Sales count" value={`${analysis.marketSnapshot.numSales}`} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <StatCard
                label="Estimated profit"
                value={`${analysis.product.currency} ${analysis.profitEstimate.estimatedProfitPerItem.toFixed(2)}`}
                hint={`Margin: ${analysis.profitEstimate.profitMarginPercent.toFixed(2)}%`}
              />
              <StatCard
                label="Assumptions"
                value={`Fees ${(analysis.profitEstimate.assumptions.ebayFeeRate + analysis.profitEstimate.assumptions.paymentProcessingRate) * 100}% + shipping ${analysis.profitEstimate.assumptions.shippingCost}`}
                hint="Update fee model in backend to match your store"
              />
            </div>
            <ListingTable listings={analysis.listings} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
