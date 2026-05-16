import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { jsPDF } from "jspdf";
import { db } from '../firebase';

const BACKEND = 'http://localhost:5000';

export default function Forecast() {
  const [transactions, setTransactions] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [startingBalance, setStartingBalance] = useState(150000);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);
  const [viewMode, setViewMode] = useState('Monthly');
  const [isExporting, setIsExporting] = useState(false);

  // Fetch approved transactions from backend (decrypted)
  useEffect(() => {
    fetch(`${BACKEND}/api/inbox`)
      .then(r => r.json())
      .then(d => {
        setTransactions((d.items || []).filter(t => t.status === 'approved'));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Configurable starting balance from Firestore settings/forecast
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'forecast'), snap => {
      if (snap.exists()) setStartingBalance(snap.data().startingBalance ?? 150000);
    });
    return unsub;
  }, []);

  // Scenarios (live)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'scenarios'), snap => {
      const items = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      setScenarios(items);
    });
    return unsub;
  }, []);

  // --- Computations ---

  // Group transactions by YYYY-MM using real timestamps
  const monthlyData = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      const amount = t.ocrResults?.[0]?.data?.amount || 0;
      const ts = t.timestamp;
      const date = ts?.seconds ? new Date(ts.seconds * 1000)
                 : ts?.toDate  ? ts.toDate()
                 : new Date();
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      map[key] = (map[key] || 0) + amount;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [transactions]);

  // Real monthly average burn rate
  const avgMonthlyBurn = useMemo(() => {
    if (!monthlyData.length) return 12500;
    return monthlyData.reduce((s, [, v]) => s + v, 0) / monthlyData.length;
  }, [monthlyData]);

  // Category breakdown from real transaction data
  const categoryTotals = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      const amount = t.ocrResults?.[0]?.data?.amount || 0;
      const cat = t.ocrResults?.[0]?.data?.category || 'Other';
      map[cat] = (map[cat] || 0) + amount;
    });
    return Object.entries(map).sort(([, a], [, b]) => b - a);
  }, [transactions]);

  // Anomaly detection: months >20% above average
  const anomalies = useMemo(() =>
    monthlyData.filter(([, v]) => v > avgMonthlyBurn * 1.2),
    [monthlyData, avgMonthlyBurn]
  );

  // Apply scenario impacts
  let projectedBurn = avgMonthlyBurn;
  scenarios.forEach(s => { if (s.isActive) projectedBurn += s.impact; });

  const multiplier = viewMode === 'Quarterly' ? 3 : 1;
  const estimatedBalance = startingBalance - projectedBurn * multiplier;
  const safeToSpend = estimatedBalance * 0.45;
  const runwayMonths = projectedBurn > 0 ? Math.floor(startingBalance / projectedBurn) : null;

  const formatCurrency = val => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  const fmtMonth = key => {
    const [y, m] = key.split('-');
    return new Date(+y, +m - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
  };

  // Build SVG chart paths from real monthly data + 3-month projection
  const chartData = useMemo(() => {
    const W = 800, H = 200;
    const now = new Date();
    const futureKeys = Array.from({ length: 3 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i + 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const all = [
      ...monthlyData.map(([k, v]) => ({ key: k, value: v, projected: false })),
      ...futureKeys.map(k => ({ key: k, value: projectedBurn, projected: true }))
    ];
    if (!all.length) return null;

    const maxV = Math.max(...all.map(p => p.value), 1);
    const xStep = W / Math.max(all.length - 1, 1);
    const toY = v => H - (v / maxV) * H * 0.85 - H * 0.05;
    const points = all.map((p, i) => ({ ...p, x: i * xStep, y: toY(p.value) }));

    const hist = points.filter(p => !p.projected);
    const proj = points.filter(p => p.projected);
    const join = hist[hist.length - 1];

    const histPath = hist.length ? `M${hist.map(p => `${p.x},${p.y}`).join(' L')}` : '';
    const projPath = join && proj.length
      ? `M${join.x},${join.y} L${proj.map(p => `${p.x},${p.y}`).join(' L')}`
      : '';

    return { points, histPath, projPath, join };
  }, [monthlyData, projectedBurn]);

  // Fetch Gemini AI insight from backend
  const fetchAiInsight = async () => {
    setInsightLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/forecast/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avgMonthlyBurn,
          projectedBurn,
          startingBalance,
          runwayMonths,
          categoryTotals: Object.fromEntries(categoryTotals),
          anomalies: anomalies.map(([k, v]) => ({ month: k, amount: v }))
        })
      });
      const data = await res.json();
      setAiInsight(data.insight || generateLocalInsight());
    } catch {
      setAiInsight(generateLocalInsight());
    } finally {
      setInsightLoading(false);
    }
  };

  const generateLocalInsight = () => {
    const parts = [];
    if (runwayMonths !== null) parts.push(`Current runway is ${runwayMonths} months at this burn rate.`);
    if (anomalies.length > 0) parts.push(`Unusual spend (>20% above average) detected in: ${anomalies.map(([k]) => fmtMonth(k)).join(', ')}.`);
    if (projectedBurn > avgMonthlyBurn) parts.push(`Active scenarios increase burn by ${formatCurrency(projectedBurn - avgMonthlyBurn)}/mo.`);
    if (categoryTotals.length > 0) parts.push(`Top spend category: ${categoryTotals[0][0]} (${formatCurrency(categoryTotals[0][1])}).`);
    return parts.join(' ') || 'Add approved transactions to generate insights.';
  };

  useEffect(() => {
    if (!loading) fetchAiInsight();
  }, [loading, projectedBurn]);

  const toggleScenario = async (id, currentStatus, label) => {
    try {
      await updateDoc(doc(db, 'scenarios', id), { isActive: !currentStatus });
      toast(!currentStatus ? `Applied: ${label}` : `Removed: ${label}`, {
        icon: !currentStatus ? '✅' : '🔄',
        style: { borderRadius: '10px', background: '#333', color: '#fff' }
      });
    } catch {
      toast.error('Failed to update scenario');
    }
  };

  const handleExportPDF = () => {
    setIsExporting(true);
    const toastId = toast.loading("Generating PDF...");
    setTimeout(() => {
      try {
        const d = new jsPDF();
        d.setFontSize(22); d.setTextColor(0, 88, 190);
        d.text("FinPilot Cash Flow Forecast", 20, 30);
        d.setFontSize(10); d.setTextColor(100, 100, 100);
        d.text(`Generated: ${new Date().toLocaleString()}`, 20, 40);
        d.setFontSize(16); d.setTextColor(0, 0, 0);
        d.text(`Summary (${viewMode})`, 20, 60);
        d.setFontSize(12);
        d.text(`Starting Balance: ${formatCurrency(startingBalance)}`, 20, 75);
        d.text(`Projected Burn: ${formatCurrency(projectedBurn * multiplier)}`, 20, 85);
        d.text(`Estimated Balance: ${formatCurrency(estimatedBalance)}`, 20, 95);
        d.text(`Safe to Spend: ${formatCurrency(safeToSpend)}`, 20, 105);
        if (runwayMonths) d.text(`Cash Runway: ${runwayMonths} months`, 20, 115);
        if (aiInsight) {
          d.setFontSize(14); d.text("AI Insight", 20, 135);
          d.setFontSize(10);
          d.text(d.splitTextToSize(aiInsight, 170), 20, 145);
        }
        d.save(`finpilot_forecast_${new Date().toISOString().split('T')[0]}.pdf`);
        toast.success("PDF downloaded!", { id: toastId });
      } catch {
        toast.error("Failed to generate PDF", { id: toastId });
      } finally {
        setIsExporting(false);
      }
    }, 1000);
  };

  return (
    <main className="p-margin-desktop min-h-[calc(100vh-64px)] max-w-[1280px] mx-auto w-full">
      {/* Header */}
      <section className="flex justify-between items-end mb-lg">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Cash Flow Forecast</h2>
          <p className="font-body-md text-on-surface-variant">AI-driven analysis based on your approved ledger data.</p>
        </div>
        <div className="flex gap-sm">
          <div className="flex bg-surface-container p-[2px] rounded-lg border border-outline-variant">
            {['Monthly', 'Quarterly'].map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-md py-1 rounded-md font-body-sm font-bold transition-all ${viewMode === m ? 'bg-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>
                {m}
              </button>
            ))}
          </div>
          <button onClick={handleExportPDF} disabled={isExporting}
            className="flex items-center gap-sm border border-outline-variant px-md py-xs rounded-lg font-body-sm font-bold hover:bg-surface-container-low transition-colors disabled:opacity-50">
            <span className={`material-symbols-outlined text-[18px] ${isExporting ? 'animate-spin' : ''}`}>
              {isExporting ? 'refresh' : 'download'}
            </span>
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>
      </section>

      {/* Anomaly Alerts */}
      {anomalies.length > 0 && (
        <div className="mb-lg bg-amber-50 border border-amber-200 rounded-xl p-md flex items-start gap-md">
          <span className="material-symbols-outlined text-amber-600 mt-[2px]">warning</span>
          <div>
            <p className="font-body-md font-bold text-amber-900">Spend Anomaly Detected</p>
            <p className="text-body-sm text-amber-800 mt-xs">
              Unusually high spend (&gt;20% above average) in: {anomalies.map(([k]) => fmtMonth(k)).join(', ')}.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-gutter">
        {/* 4 Metric Cards */}
        <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-gutter mb-sm">
          <div className="bg-surface border border-outline-variant p-md rounded-xl flex flex-col justify-between shadow-sm">
            <div>
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-xs">Est. {viewMode === 'Quarterly' ? 'Quarterly' : '30-Day'} Balance</p>
              <h3 className="font-headline-sm text-headline-sm font-bold">{formatCurrency(estimatedBalance)}</h3>
            </div>
            <div className="mt-md flex items-center gap-xs text-primary font-bold text-body-sm">
              <span className="material-symbols-outlined text-[16px]">account_balance</span>
              <span>From {formatCurrency(startingBalance)}</span>
            </div>
          </div>

          <div className="bg-surface border border-outline-variant p-md rounded-xl flex flex-col justify-between shadow-sm">
            <div>
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-xs">Burn Rate</p>
              <h3 className="font-headline-sm text-headline-sm font-bold">
                {formatCurrency(projectedBurn * multiplier)}
                <span className="text-body-sm font-normal text-on-surface-variant"> {viewMode === 'Quarterly' ? '/qtr' : '/mo'}</span>
              </h3>
            </div>
            <div className={`mt-md flex items-center gap-xs font-bold text-body-sm ${projectedBurn > avgMonthlyBurn ? 'text-error' : 'text-emerald-600'}`}>
              <span className="material-symbols-outlined text-[16px]">{projectedBurn > avgMonthlyBurn ? 'trending_up' : 'trending_down'}</span>
              <span>{projectedBurn > avgMonthlyBurn ? 'Burn increased' : 'Optimized'}</span>
            </div>
          </div>

          <div className="bg-primary-container text-on-primary-container p-md rounded-xl flex flex-col justify-between border border-primary shadow-sm">
            <div>
              <p className="font-label-caps text-label-caps opacity-80 uppercase mb-xs text-on-primary-container">Safe to Spend</p>
              <h3 className="font-headline-sm text-headline-sm font-bold">{formatCurrency(safeToSpend * multiplier)}</h3>
            </div>
            <div className="mt-md flex items-center gap-xs text-on-primary-container font-medium text-body-sm">
              <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings:"'FILL' 1"}}>verified_user</span>
              <span>45% of balance</span>
            </div>
          </div>

          {/* Runway Calculator */}
          <div className="bg-surface border border-outline-variant p-md rounded-xl flex flex-col justify-between shadow-sm">
            <div>
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-xs">Cash Runway</p>
              <h3 className="font-headline-sm text-headline-sm font-bold">
                {runwayMonths !== null ? `${runwayMonths} mo` : '∞'}
              </h3>
            </div>
            <div className={`mt-md flex items-center gap-xs font-bold text-body-sm ${runwayMonths !== null && runwayMonths < 6 ? 'text-error' : 'text-emerald-600'}`}>
              <span className="material-symbols-outlined text-[16px]">{runwayMonths !== null && runwayMonths < 6 ? 'emergency' : 'check_circle'}</span>
              <span>{runwayMonths !== null && runwayMonths < 6 ? 'Critical — act now' : 'Healthy'}</span>
            </div>
          </div>
        </div>

        {/* Chart + AI Insight */}
        <div className="col-span-12 lg:col-span-8 space-y-gutter">
          <div className="bg-surface border border-outline-variant rounded-xl p-lg relative overflow-hidden shadow-sm" style={{minHeight: '360px'}}>
            <div className="flex justify-between items-start mb-lg">
              <div>
                <h4 className="font-body-lg font-bold">Liquidity Projection</h4>
                <p className="text-body-sm text-on-surface-variant">Historical spend (Solid) vs. Predicted future (Dashed)</p>
              </div>
              <div className="flex gap-md">
                <div className="flex items-center gap-xs">
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Historical</span>
                </div>
                <div className="flex items-center gap-xs">
                  <div className="w-6 border-t-2 border-dashed border-primary mt-[1px]"></div>
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Predicted</span>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-48 text-on-surface-variant text-body-sm">Loading data...</div>
            ) : !chartData ? (
              <div className="flex flex-col items-center justify-center h-48 text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl mb-sm">bar_chart</span>
                <p className="text-body-md font-bold">No approved transactions yet</p>
                <p className="text-body-sm">Approve transactions in the Review Queue to see your forecast</p>
              </div>
            ) : (
              <div className="px-sm pb-lg">
                <svg className="w-full" viewBox="0 0 800 200" preserveAspectRatio="none" style={{height: '200px'}}>
                  {[0.25, 0.5, 0.75].map(f => (
                    <line key={f} x1="0" y1={200 * f} x2="800" y2={200 * f} stroke="rgba(114,119,133,0.12)" strokeWidth="1" />
                  ))}
                  {chartData.histPath && (
                    <path d={chartData.histPath} fill="none" stroke="#0058be" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                  {chartData.projPath && (
                    <path d={chartData.projPath} fill="none" stroke="#0058be" strokeWidth="3"
                      strokeDasharray="8,4" strokeLinecap="round" strokeLinejoin="round"
                      className="transition-all duration-700 ease-in-out" />
                  )}
                  {chartData.points.filter(p => !p.projected).map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y}
                      r={anomalies.some(([k]) => k === p.key) ? 7 : 4}
                      fill={anomalies.some(([k]) => k === p.key) ? '#f59e0b' : '#0058be'}
                      stroke="white" strokeWidth="2" />
                  ))}
                  {chartData.join && (
                    <circle cx={chartData.join.x} cy={chartData.join.y} r="6" fill="#0058be" stroke="white" strokeWidth="2" />
                  )}
                </svg>
                <div className="flex mt-sm">
                  {chartData.points.map((p, i) => (
                    <span key={i} className={`text-[10px] font-bold uppercase tracking-wider text-center truncate ${p.projected ? 'text-primary/50' : 'text-on-surface-variant'}`}
                      style={{ width: `${100 / chartData.points.length}%` }}>
                      {fmtMonth(p.key)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Insights */}
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-md flex items-start gap-md shadow-sm">
            <div className="bg-primary-container text-on-primary-container p-xs rounded shrink-0">
              <span className="material-symbols-outlined">auto_awesome</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-xs">
                <h5 className="text-body-md font-bold text-on-surface">FinPilot AI Insights</h5>
                <button onClick={fetchAiInsight} disabled={insightLoading}
                  className="text-[11px] text-primary font-bold hover:underline disabled:opacity-50">
                  {insightLoading ? 'Thinking...' : 'Refresh ↻'}
                </button>
              </div>
              <p className="text-body-sm text-on-surface-variant">
                {insightLoading ? 'Analyzing your spend patterns...' : (aiInsight || generateLocalInsight())}
              </p>
            </div>
          </div>
        </div>

        {/* Scenario Planner */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-surface border border-outline-variant rounded-xl flex flex-col sticky top-20 shadow-sm">
            <div className="p-md border-b border-outline-variant flex items-center justify-between">
              <h4 className="font-body-lg font-bold">Scenario Planner</h4>
              <span className="material-symbols-outlined text-outline text-[20px]">info</span>
            </div>
            <div className="p-md space-y-md flex-grow">
              <p className="text-body-sm text-on-surface-variant mb-md">Toggle "What-if" variables to see impact on your forecast.</p>
              {scenarios.map(s => (
                <div key={s.id} onClick={() => toggleScenario(s.id, s.isActive, s.title)}
                  className={`group p-sm border rounded-lg transition-all cursor-pointer ${s.isActive ? 'border-primary bg-primary-container/10' : 'border-outline-variant hover:border-primary'}`}>
                  <div className="flex justify-between items-start mb-sm">
                    <div className="flex items-center gap-sm">
                      <span className={`material-symbols-outlined ${s.isActive ? 'text-primary' : 'text-on-surface-variant'}`}>
                        {s.type === 'expense' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                      <span className="font-body-md font-bold">{s.title}</span>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${s.isActive ? 'bg-primary' : 'bg-surface-container-highest'}`}>
                      <div className={`absolute top-[2px] w-4 h-4 bg-white rounded-full shadow-sm transition-all ${s.isActive ? 'right-[2px]' : 'left-[2px]'}`}></div>
                    </div>
                  </div>
                  <div className="flex justify-between text-body-sm">
                    <span className="text-on-surface-variant">Est. Impact:</span>
                    <span className={`font-bold ${s.impact < 0 ? 'text-emerald-600' : 'text-error'}`}>
                      {s.impact < 0 ? `+${formatCurrency(Math.abs(s.impact))}` : `-${formatCurrency(s.impact)}`}/mo
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-md border-t border-outline-variant bg-surface-container-low">
              <div className="flex justify-between">
                <span className="text-body-sm font-bold">Scenario Result:</span>
                <span className={`text-body-sm font-bold ${projectedBurn <= avgMonthlyBurn ? 'text-emerald-600' : 'text-error'}`}>
                  {projectedBurn <= avgMonthlyBurn ? '+' : '-'}{formatCurrency(Math.abs(avgMonthlyBurn - projectedBurn))} /mo
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actual Category Breakdown */}
      <section className="mt-xl pb-xl">
        <h4 className="font-label-caps text-label-caps text-outline uppercase mb-md">Actual Spend by Category</h4>
        <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          {categoryTotals.length === 0 ? (
            <div className="p-lg text-center text-on-surface-variant text-body-sm">
              No approved transactions yet. Data will appear once transactions are approved.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low">
                  <tr>
                    <th className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant">Category</th>
                    <th className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant text-right">Total Spend</th>
                    <th className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant text-right">% of Burn</th>
                    <th className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant text-right">Month 1 (P)</th>
                    <th className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant text-right">Month 2 (P)</th>
                  </tr>
                </thead>
                <tbody className="text-body-sm divide-y divide-outline-variant">
                  {categoryTotals.map(([cat, total]) => {
                    const scenarioImpact = scenarios
                      .filter(s => s.isActive && s.category === cat)
                      .reduce((sum, s) => sum + s.impact, 0);
                    const avgPerMonth = monthlyData.length ? total / monthlyData.length : total;
                    const pct = avgMonthlyBurn > 0 ? ((avgPerMonth / avgMonthlyBurn) * 100).toFixed(0) : 0;
                    return (
                      <tr key={cat} className={`hover:bg-primary/5 transition-colors ${anomalies.length > 0 && cat === categoryTotals[0][0] ? 'bg-amber-50/40' : ''}`}>
                        <td className="px-md py-md font-medium">{cat}</td>
                        <td className="px-md py-md text-right font-data-mono">{formatCurrency(total)}</td>
                        <td className="px-md py-md text-right text-on-surface-variant">{pct}%</td>
                        <td className="px-md py-md text-right font-data-mono">{formatCurrency(avgPerMonth + scenarioImpact)}</td>
                        <td className="px-md py-md text-right font-data-mono">{formatCurrency(avgPerMonth + scenarioImpact)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
