import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { db } from '../firebase';
import Tooltip from '../components/Tooltip';

export default function Overview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    pendingReview: 0,
    approved: 0,
    monthlySpend: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartRange, setChartRange] = useState('30');
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef(null);

  const handleExport = async () => {
    setIsExporting(true);
    const toastId = toast.loading('Preparing CSV export...');
    try {
      const q = query(collection(db, 'inbox'), where('status', '==', 'approved'));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        toast.error('No approved transactions to export.', { id: toastId });
        return;
      }

      // Build CSV rows
      const headers = ['Date', 'Vendor', 'Category', 'Amount (USD)', 'Source', 'Confidence'];
      const rows = snapshot.docs.map(doc => {
        const data = doc.data()?.ocrResults?.[0]?.data || {};
        const source = doc.data()?.source || 'Manual';
        return [
          data.date || '',
          `"${(data.vendor || 'Unknown').replace(/"/g, '""')}"`,
          data.category || 'Uncategorized',
          data.amount || 0,
          source,
          data.confidence || ''
        ].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `finpilot-ledger-${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${snapshot.size} transactions successfully!`, { id: toastId });
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Export failed. Please try again.', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    // Listen to the inbox collection
    const q = query(collection(db, 'inbox'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let pending = 0;
      let approvedCount = 0;
      let spend = 0;
      const items = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        items.push({ id: doc.id, ...data });
        
        if (data.status === 'needs_review') {
          pending++;
        } else if (data.status === 'approved') {
          approvedCount++;
          const amount = data.ocrResults?.[0]?.data?.amount || 0;
          spend += Number(amount);
        }
      });

      items.sort((a, b) => b.receivedAt?.toDate() - a.receivedAt?.toDate());
      
      setStats({
        pendingReview: pending,
        approved: approvedCount,
        monthlySpend: spend
      });
      setRecentActivity(items.slice(0, 5));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching overview data:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading("Uploading document for AI analysis...");
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('from', 'Manual Upload');
    formData.append('subject', 'Uploaded via Dashboard');

    try {
      const response = await fetch('http://localhost:5000/api/webhooks/email', {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        toast.success("Extraction started! The document will appear in your queue shortly.", { id: toastId });
      } else {
        toast.error("Failed to start extraction.", { id: toastId });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Error uploading file.", { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
  };

  const getSourceIcon = (source) => {
    if (source === 'email') return 'mail';
    if (source === 'mobile_upload') return 'camera_alt';
    return 'description';
  };

  return (
    <main className="p-margin-desktop max-w-[1280px]">
      {/* Header Section */}
      <div className="flex justify-between items-end mb-xl">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Overview</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Real-time financial intelligence and data extraction.</p>
        </div>
        <div className="flex gap-sm">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
            accept="image/*,.pdf"
          />
          <button 
            onClick={() => fileInputRef.current.click()}
            disabled={isUploading}
            className={`${isUploading ? 'bg-surface-container text-on-surface-variant' : 'bg-primary hover:bg-primary-fixed-dim text-on-primary'} px-lg py-md rounded-lg font-body-md font-bold flex items-center gap-sm transition-all shadow-sm`}
          >
            {isUploading ? (
              <span className="material-symbols-outlined animate-spin" data-icon="autorenew">autorenew</span>
            ) : (
              <span className="material-symbols-outlined" data-icon="add" style={{fontVariationSettings: "'FILL' 0, 'wght' 700"}}>add</span>
            )}
            {isUploading ? 'Processing...' : 'New Extraction'}
          </button>
        </div>
      </div>

      {/* Top Row: Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-xl">
        {/* Pending Review Card */}
        <div 
          onClick={() => navigate('/review')}
          className="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl flex flex-col justify-between cursor-pointer hover:border-primary hover:shadow-md transition-all group"
        >
          <div className="flex justify-between items-start">
            <span className="text-label-caps font-label-caps text-on-surface-variant uppercase">Pending Review</span>
            <span className="material-symbols-outlined text-secondary group-hover:text-primary transition-colors" data-icon="pending_actions">pending_actions</span>
          </div>
          <div className="mt-md">
            <p className="text-[32px] font-bold text-on-surface">{loading ? '...' : stats.pendingReview}</p>
            <p className={`text-body-sm flex items-center gap-xs font-medium ${stats.pendingReview > 0 ? 'text-error' : 'text-emerald-600'}`}>
              <span className="material-symbols-outlined text-[14px]" data-icon={stats.pendingReview > 0 ? "priority_high" : "check_circle"}>
                {stats.pendingReview > 0 ? "priority_high" : "check_circle"}
              </span>
              {stats.pendingReview > 0 ? 'Needs attention today' : 'All caught up!'}
            </p>
          </div>
        </div>

        {/* Monthly Spend Card */}
        <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-label-caps font-label-caps text-on-surface-variant uppercase">Approved Spend</span>
            <span className="material-symbols-outlined text-secondary" data-icon="payments">payments</span>
          </div>
          <div className="mt-md">
            <p className="text-[32px] font-bold text-on-surface">{loading ? '...' : formatCurrency(stats.monthlySpend)}</p>
            <p className="text-body-sm text-on-surface-variant flex items-center gap-xs">
              <span className="material-symbols-outlined text-[14px] text-primary" data-icon="analytics">analytics</span>
              Calculated from approved items
            </p>
          </div>
        </div>

        {/* Ready for Export Card */}
        <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-label-caps font-label-caps text-on-surface-variant uppercase">Ready for Export</span>
            <Tooltip text="Download as CSV" position="bottom">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="material-symbols-outlined text-secondary hover:text-primary hover:scale-110 transition-all disabled:opacity-50 cursor-pointer"
                data-icon="file_upload"
              >
                {isExporting ? 'hourglass_empty' : 'file_upload'}
              </button>
            </Tooltip>
          </div>
          <div className="mt-md">
            <p className="text-[32px] font-bold text-on-surface">{loading ? '...' : stats.approved}</p>
            <p className="text-body-sm text-on-surface-variant flex items-center gap-xs">
              <span className="material-symbols-outlined text-[14px]" data-icon="check_circle">check_circle</span>
              Verified &amp; synced
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Cash Flow Trend Chart (Mock) */}
        <div className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant p-lg rounded-xl">
          <div className="flex justify-between items-center mb-lg">
            <h3 className="font-headline-sm text-headline-sm">Cash Flow Trend</h3>
            <div className="flex gap-sm">
              <button 
                onClick={() => setChartRange('30')}
                className={`px-md py-xs rounded text-label-caps font-label-caps border border-outline-variant transition-colors ${chartRange === '30' ? 'bg-surface-container text-on-surface' : 'bg-transparent text-on-surface-variant'}`}
              >
                30 DAYS
              </button>
              <button 
                onClick={() => setChartRange('90')}
                className={`px-md py-xs rounded text-label-caps font-label-caps border border-outline-variant transition-colors ${chartRange === '90' ? 'bg-surface-container text-on-surface' : 'bg-transparent text-on-surface-variant'}`}
              >
                90 DAYS
              </button>
            </div>
          </div>
          <div className="h-[280px] w-full flex items-end justify-between relative">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
              <div className="border-b border-outline w-full h-0"></div>
              <div className="border-b border-outline w-full h-0"></div>
              <div className="border-b border-outline w-full h-0"></div>
              <div className="border-b border-outline w-full h-0"></div>
            </div>
            <div className="w-full h-full relative overflow-hidden">
              <svg className={`w-full h-full transition-opacity duration-500 ${chartRange === '90' ? 'opacity-0 absolute' : 'opacity-100'}`} preserveAspectRatio="none" viewBox="0 0 800 200">
                <path d="M0,150 L100,130 L200,160 L300,110 L400,120 L500,80 L600,90 L700,50 L800,60" fill="none" stroke="#3B82F6" strokeWidth="3"></path>
                <path d="M0,150 L100,130 L200,160 L300,110 L400,120 L500,80 L600,90 L700,50 L800,60 L800,200 L0,200 Z" fill="url(#chartGradient30)" opacity="0.1"></path>
                <defs>
                  <linearGradient id="chartGradient30" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6"></stop>
                    <stop offset="100%" stopColor="transparent"></stop>
                  </linearGradient>
                </defs>
              </svg>
              <svg className={`w-full h-full transition-opacity duration-500 ${chartRange === '30' ? 'opacity-0 absolute' : 'opacity-100'}`} preserveAspectRatio="none" viewBox="0 0 800 200">
                <path d="M0,110 L100,160 L200,120 L300,180 L400,90 L500,140 L600,80 L700,120 L800,40" fill="none" stroke="#10B981" strokeWidth="3"></path>
                <path d="M0,110 L100,160 L200,120 L300,180 L400,90 L500,140 L600,80 L700,120 L800,40 L800,200 L0,200 Z" fill="url(#chartGradient90)" opacity="0.1"></path>
                <defs>
                  <linearGradient id="chartGradient90" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#10B981"></stop>
                    <stop offset="100%" stopColor="transparent"></stop>
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute bottom-0 w-full flex justify-between text-[10px] text-on-surface-variant font-medium px-base">
                {chartRange === '30' ? (
                  <><span>MAY 01</span><span>MAY 10</span><span>MAY 20</span><span>MAY 30</span></>
                ) : (
                  <><span>FEB</span><span>MAR</span><span>APR</span><span>MAY</span></>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pending Review Widget */}
        <div className="lg:col-span-4 space-y-gutter">
          <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl">
            <div className="flex items-center justify-between mb-md">
              <h3 className="font-headline-sm text-headline-sm">Next in Queue</h3>
              {stats.pendingReview > 0 && <span className="px-sm py-xs bg-error-container text-on-error-container text-[10px] font-bold rounded">URGENT</span>}
            </div>
            {stats.pendingReview > 0 ? (
              <>
                <div onClick={() => navigate('/review')} className="relative group cursor-pointer overflow-hidden rounded-lg border border-outline-variant mb-md">
                  <div className="w-full h-40 bg-surface-container flex items-center justify-center relative overflow-hidden">
                    {(() => {
                      const item = recentActivity.find(i => i.status === 'needs_review');
                      const fileUrl = item?.ocrResults?.[0]?.fileUrl || '';
                      if (fileUrl.toLowerCase().endsWith('.pdf')) {
                        return (
                          <iframe 
                            src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
                            className="w-full h-full border-none pointer-events-none"
                            title="PDF Preview"
                          />
                        );
                      }
                      return fileUrl ? (
                        <img 
                          src={fileUrl} 
                          alt="Receipt" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-outline text-[40px]">receipt</span>
                      );
                    })()}
                  </div>
                  <div className="absolute inset-0 bg-on-surface/5 group-hover:bg-transparent transition-colors"></div>
                  <div className="absolute bottom-md left-md bg-white/90 backdrop-blur-sm px-sm py-xs rounded text-[10px] font-bold text-on-surface border border-outline-variant shadow-sm">
                      {formatCurrency(recentActivity.find(i => i.status === 'needs_review')?.ocrResults?.[0]?.data?.amount || 0)}
                  </div>
                </div>
                <div className="space-y-sm">
                  <p className="font-body-md font-semibold text-on-surface">{recentActivity.find(i => i.status === 'needs_review')?.ocrResults?.[0]?.data?.vendor || 'Pending Document'}</p>
                  <button onClick={() => navigate('/review')} className="w-full mt-md bg-on-secondary-fixed text-white font-body-sm font-bold py-sm rounded-lg hover:bg-on-secondary-fixed-variant transition-colors">Review Item</button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-xl text-center">
                <span className="material-symbols-outlined text-[48px] text-emerald-500 mb-sm">task_alt</span>
                <p className="font-body-md text-on-surface font-semibold">Queue is empty!</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity List */}
        <div className="lg:col-span-12 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden mt-md">
          <div className="p-lg border-b border-outline-variant flex justify-between items-center">
            <h3 className="font-headline-sm text-headline-sm">Recent Activity</h3>
            <button 
              onClick={() => navigate('/ledger')}
              className="flex items-center gap-xs text-primary font-body-sm font-bold transition-colors group"
            >
              <span className="group-hover:underline">View All in Ledger</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low text-label-caps font-label-caps text-on-surface-variant">
                <tr>
                  <th className="px-lg py-md">SOURCE</th>
                  <th className="px-lg py-md">DATE</th>
                  <th className="px-lg py-md">AMOUNT</th>
                  <th className="px-lg py-md">CATEGORY</th>
                  <th className="px-lg py-md">STATUS</th>
                  <th className="px-lg py-md"></th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-on-surface">
                {recentActivity.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-lg py-xl text-center text-on-surface-variant">No activity found.</td>
                  </tr>
                ) : (
                  recentActivity.map((item) => {
                    const data = item.ocrResults?.[0]?.data || {};
                    return (
                      <tr key={item.id} className="border-b border-outline-variant hover:bg-primary-container/5 transition-colors group">
                        <td className="px-lg py-md flex items-center gap-sm">
                          <span className="material-symbols-outlined text-secondary" data-icon={getSourceIcon(item.source)}>{getSourceIcon(item.source)}</span>
                          <span>{data.vendor || item.from || 'Unknown Source'}</span>
                        </td>
                        <td className="px-lg py-md text-on-surface-variant">{formatDate(item.receivedAt)}</td>
                        <td className="px-lg py-md font-semibold font-data-mono text-data-mono">{formatCurrency(data.amount || 0)}</td>
                        <td className="px-lg py-md">
                          <span className="px-sm py-xs bg-surface-container rounded text-[11px] font-medium border border-outline-variant">{data.category || 'Uncategorized'}</span>
                        </td>
                        <td className="px-lg py-md">
                          {item.status === 'approved' ? (
                            <span className="flex items-center gap-xs text-[#065f46] font-bold">
                              <span className="material-symbols-outlined text-[16px]" data-icon="check_circle" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
                              Approved
                            </span>
                          ) : (
                            <span className="flex items-center gap-xs text-on-secondary-fixed-variant font-bold">
                              <span className="material-symbols-outlined text-[16px]" data-icon="pending">pending</span>
                              Pending Review
                            </span>
                          )}
                        </td>
                        <td className="px-lg py-md text-right">
                          <button className="material-symbols-outlined text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" data-icon="more_vert">more_vert</button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
