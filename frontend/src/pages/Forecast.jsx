import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { jsPDF } from "jspdf";
import { db } from '../firebase';

export default function Forecast() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scenarios, setScenarios] = useState({
    addEmployee: false,
    cutSaaS: false,
    increaseAds: false
  });

  useEffect(() => {
    const q = query(collection(db, 'inbox'), where('status', '==', 'approved'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => items.push(doc.data()));
      setTransactions(items);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const totalHistoricalSpend = transactions.reduce((sum, t) => sum + (t.ocrResults?.[0]?.data?.amount || 0), 0);
  const avgMonthlyBurn = transactions.length > 0 ? (totalHistoricalSpend / Math.max(1, transactions.length / 5)) : 12500;

  // Scenario Adjustments
  const employeeCost = 8500;
  const saasSavings = 1200;
  const adCost = 3000;

  let projectedBurn = avgMonthlyBurn;
  if (scenarios.addEmployee) projectedBurn += employeeCost;
  if (scenarios.cutSaaS) projectedBurn -= saasSavings;
  if (scenarios.increaseAds) projectedBurn += adCost;

  const estimatedBalance = 150000 - projectedBurn;
  const safeToSpend = estimatedBalance * 0.45;

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const toggleScenario = (key, label) => {
    const newState = !scenarios[key];
    setScenarios(prev => ({ ...prev, [key]: newState }));
    toast(newState ? `Applied: ${label}` : `Removed: ${label}`, {
      icon: newState ? '✅' : '🔄',
      style: { borderRadius: '10px', background: '#333', color: '#fff' }
    });
  };

  const [viewMode, setViewMode] = useState('Monthly');
  const [isExporting, setIsExporting] = useState(false);

  const multiplier = viewMode === 'Quarterly' ? 3 : 1;

  const handleExportPDF = () => {
    setIsExporting(true);
    const toastId = toast.loading("Generating High-Fidelity PDF...");
    
    setTimeout(() => {
      try {
        const doc = new jsPDF();
        
        // Add Title
        doc.setFontSize(22);
        doc.setTextColor(0, 88, 190); 
        doc.text("FinPilot Cash Flow Forecast", 20, 30);
        
        // Add Date
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 40);
        
        // Add Summary Section
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text(`Summary (${viewMode})`, 20, 60);
        
        doc.setFontSize(12);
        doc.text(`Estimated Balance: ${formatCurrency(estimatedBalance * multiplier)}`, 20, 75);
        doc.text(`Predicted Burn Rate: ${formatCurrency(projectedBurn * multiplier)}`, 20, 85);
        doc.text(`Safe to Spend: ${formatCurrency(safeToSpend * multiplier)}`, 20, 95);
        
        // Add Scenarios
        doc.setFontSize(16);
        doc.text("Scenario Planning Analysis", 20, 115);
        doc.setFontSize(12);
        doc.text(`- Add New Employee: ${scenarios.addEmployee ? 'ACTIVE' : 'INACTIVE'}`, 20, 125);
        doc.text(`- Cut SaaS Spend: ${scenarios.cutSaaS ? 'ACTIVE' : 'INACTIVE'}`, 20, 135);
        doc.text(`- Increase Ad Budget: ${scenarios.increaseAds ? 'ACTIVE' : 'INACTIVE'}`, 20, 145);
        
        // AI Insights
        doc.setFillColor(240, 244, 255);
        doc.rect(20, 160, 170, 30, 'F');
        doc.setTextColor(0, 88, 190);
        doc.setFontSize(14);
        doc.text("AI Intelligence Insight", 25, 170);
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        const insightText = scenarios.cutSaaS 
          ? "Optimization plan active: SaaS savings of $1,200/mo projected. Runway extended by 14 days." 
          : `Current burn of ${formatCurrency(projectedBurn)} is sustainable. Review subscriptions to extend runway.`;
        doc.text(insightText, 25, 180);

        doc.save(`finpilot_forecast_${new Date().toISOString().split('T')[0]}.pdf`);
        
        setIsExporting(false);
        toast.success("Forecast PDF downloaded!", { id: toastId });
      } catch (err) {
        console.error(err);
        toast.error("Failed to generate PDF", { id: toastId });
        setIsExporting(false);
      }
    }, 2000);
  };

  return (
    <main className="p-margin-desktop min-h-[calc(100vh-64px)] max-w-[1280px] mx-auto w-full">
      {/* Header Section */}
      <section className="flex justify-between items-end mb-lg">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Cash Flow Forecast</h2>
          <p className="font-body-md text-on-surface-variant">AI-driven analysis based on your approved ledger data.</p>
        </div>
        <div className="flex gap-sm">
          <div className="flex bg-surface-container p-[2px] rounded-lg border border-outline-variant">
            <button 
              onClick={() => setViewMode('Monthly')}
              className={`px-md py-1 rounded-md font-body-sm font-bold transition-all ${viewMode === 'Monthly' ? 'bg-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setViewMode('Quarterly')}
              className={`px-md py-1 rounded-md font-body-sm font-bold transition-all ${viewMode === 'Quarterly' ? 'bg-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Quarterly
            </button>
          </div>
          <button 
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-sm border border-outline-variant px-md py-xs rounded-lg font-body-sm font-bold hover:bg-surface-container-low transition-colors disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[18px] ${isExporting ? 'animate-spin' : ''}`}>
              {isExporting ? 'refresh' : 'download'}
            </span>
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>
      </section>

      <div className="grid grid-cols-12 gap-gutter">
        {/* Key Metrics Grid */}
        <div className="col-span-12 grid grid-cols-1 md:grid-cols-3 gap-gutter mb-sm">
          {/* Estimated Balance */}
          <div className="bg-surface border border-outline-variant p-md rounded-xl flex flex-col justify-between shadow-sm">
            <div>
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-xs">Estimated {viewMode === 'Quarterly' ? 'Q3' : '30-Day'} Balance</p>
              <h3 className="font-headline-sm text-headline-sm font-bold">{formatCurrency(estimatedBalance * multiplier)}</h3>
            </div>
            <div className="mt-md flex items-center gap-xs text-primary font-bold text-body-sm">
              <span className="material-symbols-outlined text-[16px]">trending_up</span>
              <span>Based on current velocity</span>
            </div>
          </div>
          {/* Predicted Burn Rate */}
          <div className="bg-surface border border-outline-variant p-md rounded-xl flex flex-col justify-between shadow-sm">
            <div>
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-xs">Predicted Burn Rate</p>
              <h3 className="font-headline-sm text-headline-sm font-bold">{formatCurrency(projectedBurn * multiplier)} <span className="text-body-sm font-normal text-on-surface-variant">{viewMode === 'Quarterly' ? '/qtr' : '/mo'}</span></h3>
            </div>
            <div className={`mt-md flex items-center gap-xs font-bold text-body-sm ${projectedBurn > avgMonthlyBurn ? 'text-error' : 'text-emerald-600'}`}>
              <span className="material-symbols-outlined text-[16px]">{projectedBurn > avgMonthlyBurn ? 'trending_up' : 'trending_down'}</span>
              <span>{projectedBurn > avgMonthlyBurn ? 'Burn increased' : 'Efficiency improved'}</span>
            </div>
          </div>
          {/* Safe to Spend */}
          <div className="bg-primary-container text-on-primary-container p-md rounded-xl flex flex-col justify-between border border-primary shadow-sm">
            <div>
              <p className="font-label-caps text-label-caps opacity-80 uppercase mb-xs text-on-primary-container">Safe to Spend</p>
              <h3 className="font-headline-sm text-headline-sm font-bold">{formatCurrency(safeToSpend * multiplier)}</h3>
            </div>
            <div className="mt-md flex items-center gap-xs text-on-primary-container font-medium text-body-sm">
              <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: "'FILL' 1"}}>verified_user</span>
              <span>98% Confidence Interval</span>
            </div>
          </div>
        </div>

        {/* Forecast Chart Area */}
        <div className="col-span-12 lg:col-span-8 space-y-gutter">
          <div className="bg-surface border border-outline-variant rounded-xl p-lg relative overflow-hidden h-[450px] shadow-sm">
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
                  <div className="w-3 h-[2px] bg-primary border-t-2 border-dashed border-primary"></div>
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Predicted</span>
                </div>
              </div>
            </div>
            
            <div className="absolute inset-0 top-32 pointer-events-none opacity-20" style={{
              backgroundImage: 'linear-gradient(to bottom, transparent 95%, rgba(114, 119, 133, 0.5) 95%), linear-gradient(to right, transparent 95%, rgba(114, 119, 133, 0.5) 95%)',
              backgroundSize: '40px 40px'
            }}></div>

            <div className="absolute inset-x-lg bottom-xl top-32 flex flex-col justify-end z-10">
              <svg className="w-full h-full" viewBox="0 0 800 240" preserveAspectRatio="none">
                {/* Historical Path (Static for now, but rooted at Today's point) */}
                <path d="M0,200 L100,180 L200,190 L300,150 L400,170" fill="none" stroke="#0058be" strokeLinecap="round" strokeWidth="3"></path>
                
                {/* Dynamic Predicted Path based on Burn Rate */}
                {(() => {
                  // Today is at x=400, y=170
                  // Jul is at x=800
                  // If burn is "neutral" (12500), we go to y=75 (Upwards trend)
                  // If burn is high, y increases (goes down)
                  const baseBurn = 12500;
                  const burnDiff = (projectedBurn - baseBurn) / 50; // Factor to scale movement
                  const endY = Math.max(20, Math.min(220, 75 + burnDiff));
                  const midY1 = 170 + (endY - 170) * 0.33;
                  const midY2 = 170 + (endY - 170) * 0.66;
                  
                  return (
                    <path 
                      d={`M400,170 L533,${midY1} L666,${midY2} L800,${endY}`} 
                      fill="none" 
                      stroke="#0058be" 
                      strokeDasharray="8,4" 
                      strokeLinecap="round" 
                      strokeWidth="3" 
                      className="transition-all duration-700 ease-in-out"
                    />
                  );
                })()}
                
                <circle cx="400" cy="170" fill="#0058be" r="6" stroke="white" strokeWidth="2"></circle>
              </svg>
              <div className="flex justify-between mt-md text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span className="text-primary">May (Today)</span>
                <span>Jun</span>
                <span>Jul</span>
                <span>Aug</span>
              </div>
            </div>
          </div>

          {/* Analysis Summary */}
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-md flex items-start gap-md shadow-sm">
            <div className="bg-primary-container text-on-primary-container p-xs rounded">
              <span className="material-symbols-outlined">auto_awesome</span>
            </div>
            <div>
              <h5 className="text-body-md font-bold text-on-surface">FinPilot AI Insights</h5>
              <p className="text-body-sm text-on-surface-variant mt-xs">
                {scenarios.cutSaaS 
                  ? "Optimization plan active: SaaS savings of $1,200/mo projected. Runway extended by 14 days." 
                  : `Your current burn of ${formatCurrency(projectedBurn)} is sustainable. We recommend reviewing software subscriptions to extend your runway further.`}
              </p>
            </div>
          </div>
        </div>

        {/* Scenario Planner Sidebar */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-surface border border-outline-variant rounded-xl flex flex-col h-full sticky top-20 shadow-sm">
            <div className="p-md border-b border-outline-variant flex items-center justify-between">
              <h4 className="font-body-lg font-bold">Scenario Planner</h4>
              <span className="material-symbols-outlined text-outline text-[20px]">info</span>
            </div>
            <div className="p-md space-y-md flex-grow">
              <p className="text-body-sm text-on-surface-variant mb-md">Toggle "What-if" variables to see impact on your 3-month forecast.</p>
              
              {/* Scenario Toggle 1 */}
              <div 
                onClick={() => toggleScenario('addEmployee', 'Add New Employee')}
                className={`group p-sm border rounded-lg transition-all cursor-pointer ${scenarios.addEmployee ? 'border-primary bg-primary-container/10' : 'border-outline-variant hover:border-primary'}`}
              >
                <div className="flex justify-between items-start mb-sm">
                  <div className="flex items-center gap-sm">
                    <span className={`material-symbols-outlined ${scenarios.addEmployee ? 'text-primary' : 'text-on-surface-variant'}`}>person_add</span>
                    <span className="font-body-md font-bold">Add New Employee</span>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${scenarios.addEmployee ? 'bg-primary' : 'bg-surface-container-highest'}`}>
                    <div className={`absolute top-[2px] w-4 h-4 bg-white rounded-full shadow-sm transition-all ${scenarios.addEmployee ? 'right-[2px]' : 'left-[2px]'}`}></div>
                  </div>
                </div>
                <div className="flex justify-between text-body-sm">
                  <span className="text-on-surface-variant">Est. Impact:</span>
                  <span className="text-error font-medium">-$8,500/mo</span>
                </div>
              </div>

              {/* Scenario Toggle 2 */}
              <div 
                onClick={() => toggleScenario('cutSaaS', 'Cut SaaS Spend')}
                className={`group p-sm border rounded-lg transition-all cursor-pointer ${scenarios.cutSaaS ? 'border-primary bg-primary-container/10' : 'border-outline-variant hover:border-primary'}`}
              >
                <div className="flex justify-between items-start mb-sm">
                  <div className="flex items-center gap-sm">
                    <span className={`material-symbols-outlined ${scenarios.cutSaaS ? 'text-primary' : 'text-on-surface-variant'}`}>cloud_off</span>
                    <span className="font-body-md font-bold">Cut SaaS Spend</span>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${scenarios.cutSaaS ? 'bg-primary' : 'bg-surface-container-highest'}`}>
                    <div className={`absolute top-[2px] w-4 h-4 bg-white rounded-full shadow-sm transition-all ${scenarios.cutSaaS ? 'right-[2px]' : 'left-[2px]'}`}></div>
                  </div>
                </div>
                <div className="flex justify-between text-body-sm">
                  <span className="text-on-surface-variant">Est. Impact:</span>
                  <span className="text-emerald-600 font-bold">+$1,200/mo</span>
                </div>
              </div>

              {/* Scenario Toggle 3 */}
              <div 
                onClick={() => toggleScenario('increaseAds', 'Increase Ad Budget')}
                className={`group p-sm border rounded-lg transition-all cursor-pointer ${scenarios.increaseAds ? 'border-primary bg-primary-container/10' : 'border-outline-variant hover:border-primary'}`}
              >
                <div className="flex justify-between items-start mb-sm">
                  <div className="flex items-center gap-sm">
                    <span className={`material-symbols-outlined ${scenarios.increaseAds ? 'text-primary' : 'text-on-surface-variant'}`}>campaign</span>
                    <span className="font-body-md font-bold">Increase Ad Budget</span>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${scenarios.increaseAds ? 'bg-primary' : 'bg-surface-container-highest'}`}>
                    <div className={`absolute top-[2px] w-4 h-4 bg-white rounded-full shadow-sm transition-all ${scenarios.increaseAds ? 'right-[2px]' : 'left-[2px]'}`}></div>
                  </div>
                </div>
                <div className="flex justify-between text-body-sm">
                  <span className="text-on-surface-variant">Est. Impact:</span>
                  <span className="text-error font-medium">-$3,000/mo</span>
                </div>
              </div>
            </div>
            
            <div className="p-md border-t border-outline-variant bg-surface-container-low">
              <div className="flex justify-between mb-sm">
                <span className="text-body-sm font-bold">Scenario Result:</span>
                <span className={`text-body-sm font-bold ${projectedBurn < avgMonthlyBurn ? 'text-emerald-600' : 'text-error'}`}>
                  {projectedBurn < avgMonthlyBurn ? '+' : '-'}{formatCurrency(Math.abs(avgMonthlyBurn - projectedBurn))} /mo
                </span>
              </div>
              <button 
                onClick={() => setScenarios({ addEmployee: false, cutSaaS: false, increaseAds: false })}
                className="w-full py-sm bg-surface text-on-surface font-bold rounded-lg border border-outline-variant hover:bg-surface-container transition-all"
              >
                Reset All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid (High Density) */}
      <section className="mt-xl pb-xl">
        <h4 className="font-label-caps text-label-caps text-outline uppercase mb-md">Forecast Breakdown by Category</h4>
        <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant">Category</th>
                  <th className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant text-right">Avg. Historical</th>
                  <th className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant text-right">Month 1 (P)</th>
                  <th className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant text-right">Month 2 (P)</th>
                  <th className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant text-right text-primary font-bold">Confidence</th>
                </tr>
              </thead>
              <tbody className="text-body-sm divide-y divide-outline-variant">
                <tr className="hover:bg-primary/5 transition-colors">
                  <td className="px-md py-md font-medium">Payroll & Benefits</td>
                  <td className="px-md py-md text-right font-data-mono">{formatCurrency(scenarios.addEmployee ? 53500 : 45000)}</td>
                  <td className="px-md py-md text-right font-data-mono">{formatCurrency(scenarios.addEmployee ? 53500 : 45000)}</td>
                  <td className="px-md py-md text-right font-data-mono">{formatCurrency(scenarios.addEmployee ? 53500 : 45000)}</td>
                  <td className="px-md py-md text-center">
                    <span className="bg-emerald-100 text-emerald-800 px-sm py-1 rounded text-[10px] font-bold uppercase tracking-tighter">High (98%)</span>
                  </td>
                </tr>
                <tr className="hover:bg-primary/5 transition-colors">
                  <td className="px-md py-md font-medium">Software & SaaS</td>
                  <td className="px-md py-md text-right font-data-mono">{formatCurrency(3200)}</td>
                  <td className="px-md py-md text-right font-data-mono">{formatCurrency(scenarios.cutSaaS ? 2000 : 3200)}</td>
                  <td className="px-md py-md text-right font-data-mono">{formatCurrency(scenarios.cutSaaS ? 2000 : 3200)}</td>
                  <td className="px-md py-md text-center">
                    <span className="bg-amber-100 text-amber-800 px-sm py-1 rounded text-[10px] font-bold uppercase tracking-tighter">Medium (85%)</span>
                  </td>
                </tr>
                <tr className="hover:bg-primary/5 transition-colors">
                  <td className="px-md py-md font-medium">Marketing & Sales</td>
                  <td className="px-md py-md text-right font-data-mono">{formatCurrency(8000)}</td>
                  <td className="px-md py-md text-right font-data-mono">{formatCurrency(scenarios.increaseAds ? 11000 : 8000)}</td>
                  <td className="px-md py-md text-right font-data-mono">{formatCurrency(scenarios.increaseAds ? 11000 : 8000)}</td>
                  <td className="px-md py-md text-center">
                    <span className="bg-blue-100 text-blue-800 px-sm py-1 rounded text-[10px] font-bold uppercase tracking-tighter">Variable (70%)</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
