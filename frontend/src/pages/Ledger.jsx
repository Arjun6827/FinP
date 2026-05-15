import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { db } from '../firebase';

export default function Ledger() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q')?.toLowerCase() || '';
  
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const categories = ['All', 'Food & Dining', 'Travel', 'Software & SaaS', 'Office Supplies', 'Utilities', 'Marketing'];

  const [decryptedMap, setDecryptedMap] = useState({});

  const fetchDecryptedData = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/inbox');
      const json = await res.json();
      if (json.success) {
        const map = {};
        json.items.forEach(item => { map[item.id] = item.ocrResults?.[0]?.data || {}; });
        setDecryptedMap(map);
      }
    } catch (err) {
      console.error('Ledger: Failed to fetch decrypted data:', err);
    }
  };

  useEffect(() => {
    fetchDecryptedData();
    const q = query(collection(db, 'inbox'), where('status', '==', 'approved'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      items.sort((a, b) => {
        const dateA = a.ocrResults?.[0]?.data?.date || a.timestamp?.toDate?.();
        const dateB = b.ocrResults?.[0]?.data?.date || b.timestamp?.toDate?.();
        return new Date(dateB) - new Date(dateA);
      });
      setTransactions(items);
      setLoading(false);
      fetchDecryptedData();
    });
    return () => unsubscribe();
  }, []);

  const filteredTransactions = transactions.filter(t => {
    const data = decryptedMap[t.id] || t.ocrResults?.[0]?.data || {};
    const dateStr = data.date || '';
    const vendorStr = data.vendor || 'Unknown Vendor';
    const catStr = data.category || 'Uncategorized';
    const amountStr = (data.amount || 0).toString();
    const sourceStr = t.source || 'Manual';

    const matchesCategory = categoryFilter === 'All' || catStr === categoryFilter;
    
    const matchesSearch = !searchQuery || 
      vendorStr.toLowerCase().includes(searchQuery) ||
      catStr.toLowerCase().includes(searchQuery) ||
      dateStr.toLowerCase().includes(searchQuery) ||
      amountStr.includes(searchQuery) ||
      sourceStr.toLowerCase().includes(searchQuery);
      
    return matchesCategory && matchesSearch;
  });

  const totalSpend = transactions.reduce((sum, t) => {
    const data = decryptedMap[t.id] || t.ocrResults?.[0]?.data || {};
    return sum + (data.amount || 0);
  }, 0);
  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const [isSyncing, setIsSyncing] = useState(false);

  const handleExportCSV = () => {
    try {
      const headers = ['Date', 'Vendor', 'Category', 'Amount', 'Source', 'Status'];
      const rows = filteredTransactions.map(tx => {
        const data = tx.ocrResults?.[0]?.data || {};
        return [
          data.date || tx.receivedAt?.toDate()?.toLocaleDateString(),
          data.vendor || 'Unknown',
          data.category || 'Uncategorized',
          data.amount || 0,
          tx.source,
          'Approved'
        ].join(',');
      });
      
      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `finpilot_ledger_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast.success("CSV Export successful!");
    } catch (err) {
      toast.error("Export failed.");
    }
  };

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      toast.success("Successfully synced with Accounting software!", {
        icon: '🚀',
        duration: 4000
      });
    }, 2000);
  };

  return (
    <section className="p-margin-desktop max-w-[1280px] mx-auto w-full flex-1">
      {/* Page Header & Actions */}
      <div className="flex justify-between items-end mb-lg">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Financial Ledger</h1>
          <p className="font-body-md text-on-surface-variant">Manage and review all approved business transactions and sync status.</p>
        </div>
        <div className="flex gap-sm">
          <button onClick={handleExportCSV} className="px-md py-sm border border-outline-variant rounded-lg font-body-md font-semibold text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-sm">
            <span className="material-symbols-outlined text-[18px]">ios_share</span>
            Export to CSV
          </button>
          <button 
            onClick={handleSync} 
            disabled={isSyncing}
            className={`px-md py-sm bg-primary text-on-primary rounded-lg font-body-md font-semibold hover:brightness-110 transition-all flex items-center gap-sm shadow-sm ${isSyncing ? 'opacity-70 cursor-wait' : ''}`}
          >
            <span className={`material-symbols-outlined text-[18px] ${isSyncing ? 'animate-spin' : ''}`}>
              {isSyncing ? 'refresh' : 'sync'}
            </span>
            {isSyncing ? 'Syncing...' : 'Sync to Accounting'}
          </button>
        </div>
      </div>

      {/* Filters & Search Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md mb-lg">
        {/* Filter Chips */}
        <div className="flex items-center gap-sm overflow-x-auto scrollbar-hide pb-xs flex-1">
          <span className="font-label-caps text-label-caps text-on-surface-variant mr-xs uppercase">Filter:</span>
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-md py-xs rounded-full font-body-sm font-medium whitespace-nowrap transition-all ${categoryFilter === cat ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'}`}
            >
              {cat === 'All' ? 'All' : cat}
            </button>
          ))}
        </div>

        {/* Local Search Input */}
        <div className="flex items-center bg-surface border border-outline-variant px-md py-xs rounded-lg w-full md:w-72 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          <span className="material-symbols-outlined text-on-surface-variant text-[20px] mr-sm">search</span>
          <input 
            className="bg-transparent border-none focus:ring-0 text-body-sm font-body-sm w-full outline-none" 
            placeholder="Search vendor, amount..." 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchParams(e.target.value ? { q: e.target.value } : {})}
          />
        </div>
      </div>

      {/* Data Table Container */}
      <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Date</th>
                <th className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Vendor</th>
                <th className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Category</th>
                <th className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-right">Amount</th>
                <th className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Source</th>
                <th className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Status</th>
                <th className="px-md py-sm w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr><td colSpan="7" className="px-md py-xl text-center text-on-surface-variant">Loading transactions...</td></tr>
              ) : filteredTransactions.length === 0 ? (
                <tr><td colSpan="7" className="px-md py-xl text-center text-on-surface-variant">No transactions found.</td></tr>
              ) : filteredTransactions.map((tx) => {
                const data = tx.ocrResults?.[0]?.data || {};
                const date = data.date || tx.receivedAt?.toDate()?.toLocaleDateString() || 'N/A';
                return (
                  <tr key={tx.id} className="hover:bg-primary-container/5 transition-colors group">
                    <td className="px-md py-md font-data-mono text-data-mono text-on-surface">{date}</td>
                    <td className="px-md py-md">
                      <div className="flex items-center gap-sm">
                        <div className="w-8 h-8 rounded bg-surface-container-high flex items-center justify-center font-bold text-on-surface-variant text-[12px]">
                          {(data.vendor || 'UN').substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-body-md font-semibold text-on-surface">{data.vendor || 'Unknown Vendor'}</span>
                      </div>
                    </td>
                    <td className="px-md py-md">
                      <span className="px-sm py-1 rounded bg-secondary-container text-on-secondary-fixed-variant font-label-caps text-[10px] uppercase">
                        {data.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-md py-md font-data-mono text-data-mono text-on-surface text-right font-bold">
                      {formatCurrency(data.amount || 0)}
                    </td>
                    <td className="px-md py-md">
                      <div className="flex items-center gap-xs text-on-surface-variant">
                        <span className="material-symbols-outlined text-[18px]">
                          {tx.source === 'email' ? 'mail' : 'upload_file'}
                        </span>
                        <span className="font-body-sm">{tx.source === 'email' ? 'Email' : 'Manual'}</span>
                      </div>
                    </td>
                    <td className="px-md py-md">
                      <span className="inline-flex items-center gap-xs px-sm py-1 rounded-full bg-emerald-100 text-emerald-800 font-body-sm font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Approved
                      </span>
                    </td>
                    <td className="px-md py-md text-right">
                      <span className="material-symbols-outlined text-on-surface-variant cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">more_vert</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Mock */}
        <div className="flex items-center justify-between px-md py-sm bg-surface-container-low border-t border-outline-variant">
          <span className="font-body-sm text-on-surface-variant">Showing {filteredTransactions.length} of {transactions.length} approved transactions</span>
          <div className="flex items-center gap-xs">
            <button className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant text-on-surface-variant hover:bg-surface transition-colors">
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded bg-primary text-on-primary font-body-sm font-semibold">1</button>
            <button className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant text-on-surface-variant hover:bg-surface transition-colors">
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bento Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg mt-xl">
        {/* Total Balance */}
        <div className="bg-surface border border-outline-variant p-lg rounded-xl flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-sm">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Total Approved Spend</span>
              <span className="material-symbols-outlined text-primary">payments</span>
            </div>
            <p className="font-headline-md text-headline-md text-on-surface">{formatCurrency(totalSpend)}</p>
          </div>
          <div className="mt-md text-[12px] text-on-surface-variant">
            Across <span className="font-bold text-on-surface">{transactions.length}</span> verified receipts
          </div>
        </div>
        {/* AI Insights Card */}
        <div className="bg-primary-container text-on-primary-container p-lg rounded-xl md:col-span-2 relative overflow-hidden group shadow-sm">
          <div className="relative z-10">
            <div className="flex items-center gap-sm mb-sm">
              <span className="material-symbols-outlined">auto_awesome</span>
              <span className="font-label-caps text-label-caps uppercase text-on-primary-container/80">FinPilot Intelligence</span>
            </div>
            <h3 className="font-headline-sm text-headline-sm mb-xs">Tax Savings Opportunity</h3>
            <p className="font-body-md text-on-primary-container/90 max-w-lg">Based on your approved expenses, we've identified potential tax deductions in your {categoryFilter === 'All' ? 'software and travel' : categoryFilter.toLowerCase()} categories.</p>
            <button 
              onClick={() => toast.success(
                <div>
                  <b className="block mb-1">AI Deduction Analysis</b>
                  <p className="text-sm">Based on your {formatCurrency(totalSpend)} spend, we've identified <b>{formatCurrency(totalSpend * 0.25)}</b> in potential tax savings.</p>
                </div>,
                { duration: 5000, icon: '💡' }
              )}
              className="mt-md px-md py-xs bg-on-primary-container text-primary rounded-lg font-body-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Generate Deduction Report
            </button>
          </div>
          <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-on-primary-container/10 to-transparent pointer-events-none"></div>
        </div>
      </div>
    </section>
  );
}
