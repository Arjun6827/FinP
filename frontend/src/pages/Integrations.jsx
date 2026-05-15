import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function Integrations() {
  const [connections, setConnections] = useState({
    email: false,
    mobile: true,
    stripe: true,
    paypal: false,
    square: true
  });
  const [connectedEmail, setConnectedEmail] = useState('finpilot700@gmail.com');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Metadata for each integration card — used to drive search filtering
  const integrationMeta = [
    { id: 'email',  name: 'Email Ingestion',    keywords: ['email', 'gmail', 'outlook', 'mail', 'inbox'] },
    { id: 'mobile', name: 'Mobile Sync',         keywords: ['mobile', 'phone', 'smartphone', 'app', 'scan'] },
    { id: 'stripe', name: 'Stripe',              keywords: ['stripe', 'payment', 'webhook', 'card'] },
    { id: 'paypal', name: 'PayPal',              keywords: ['paypal', 'payment', 'webhook'] },
    { id: 'square', name: 'Square',              keywords: ['square', 'pos', 'point of sale', 'payment'] },
  ];

  const isVisible = (id) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const meta = integrationMeta.find(m => m.id === id);
    return meta?.name.toLowerCase().includes(q) || meta?.keywords.some(k => k.includes(q));
  };

  // Load settings from Firestore
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'integrations');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setConnections(data.connections || connections);
          setConnectedEmail(data.connectedEmail || 'finpilot700@gmail.com');
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    fetchSettings();
  }, []);

  // Save settings to Firestore
  const saveSettings = async (newConnections, newEmail = connectedEmail) => {
    try {
      await setDoc(doc(db, 'settings', 'integrations'), {
        connections: newConnections,
        connectedEmail: newEmail,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  const toggleConnection = async (id, name) => {
    const isConnecting = !connections[id];
    const newConnections = { ...connections, [id]: isConnecting };
    
    if (isConnecting) {
      const toastId = toast.loading(`Connecting to ${name}...`);
      setTimeout(async () => {
        setConnections(newConnections);
        await saveSettings(newConnections);
        toast.success(`${name} connected successfully!`, { id: toastId });
      }, 1500);
    } else {
      setConnections(newConnections);
      await saveSettings(newConnections);
      setIsEditingEmail(false);
      toast.error(`${name} disconnected.`);
    }
  };

  const handleEmailChange = async (e) => {
    e.preventDefault();
    const newEmail = e.target.email.value;
    if (newEmail) {
      setConnectedEmail(newEmail);
      setIsEditingEmail(false);
      await saveSettings(connections, newEmail);
      toast.success("Ingestion mailbox updated!");
    }
  };


  const handleSyncAll = async () => {
    setIsSyncing(true);
    const toastId = toast.loading("Syncing all active integrations...");
    
    try {
      const response = await fetch('http://localhost:8001/sync', {
        method: 'POST',
      });
      
      if (response.ok) {
        toast.success("Sync completed! Your records are now up to date.", { id: toastId });
      } else {
        throw new Error("Failed to sync");
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Sync failed. Please ensure the Python service is running.", { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <main className="p-margin-desktop min-h-screen max-w-[1280px] mx-auto w-full pb-xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-xl gap-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Integration Settings</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Configure and manage your data ingestion channels.</p>
          {/* Privacy Shield Badge */}
          <div className="inline-flex items-center gap-xs mt-sm px-sm py-1 rounded-full bg-emerald-50 border border-emerald-200">
            <span className="material-symbols-outlined text-emerald-600 text-[14px]">shield</span>
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Privacy Shield Active</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
        </div>
        <div className="flex gap-sm w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
            <input 
              type="text" 
              placeholder="Search integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-container rounded-lg border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-body-sm"
            />
          </div>
          <button 
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="flex items-center gap-sm bg-primary text-on-primary px-lg py-2 rounded-lg font-body-sm font-bold hover:bg-primary-container transition-all disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[18px] ${isSyncing ? 'animate-spin' : ''}`}>
              {isSyncing ? 'sync' : 'sync_alt'}
            </span>
            {isSyncing ? 'Syncing...' : 'Sync All'}
          </button>
        </div>
      </div>

      {/* Bento-style Grid for Integrations */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        
        {/* Card 1: Email (Gmail/Outlook) */}
        {isVisible('email') && <div className={`md:col-span-8 bg-surface border rounded-xl p-lg flex flex-col justify-between shadow-sm transition-all ${connections.email ? 'border-primary shadow-md' : 'border-outline-variant'}`}>
          <div>
            <div className="flex items-start justify-between mb-md">
              <div className="flex items-center gap-md">
                <div className={`w-14 h-14 rounded-lg flex items-center justify-center transition-colors ${connections.email ? 'bg-primary text-on-primary' : 'bg-secondary-container text-primary'}`}>
                  <span className="material-symbols-outlined text-[32px]">mail</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">Email Ingestion</h3>
                  <span className="font-label-caps text-label-caps text-on-surface-variant bg-surface-container px-sm py-1 rounded">GMAIL & OUTLOOK</span>
                </div>
              </div>
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-white border border-outline-variant flex items-center justify-center overflow-hidden shadow-sm">
                  <img alt="Gmail" className="w-4 h-4 object-contain" src="https://www.gstatic.com/images/branding/product/2x/gmail_48dp.png"/>
                </div>
                <div className="w-8 h-8 rounded-full bg-white border border-outline-variant flex items-center justify-center overflow-hidden shadow-sm">
                  {/* Outlook inline SVG — avoids external URL blocking */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                    <path fill="#1976D2" d="M28,12h13.5C42.9,12,44,13.1,44,14.5v19c0,1.4-1.1,2.5-2.5,2.5H28V12z"/>
                    <path fill="#fff" d="M28,20h16v8H28V20z"/>
                    <path fill="#1976D2" d="M28,20h16v2H28V20z"/>
                    <path fill="#1976D2" d="M28,26h16v2H28V26z"/>
                    <path fill="#2196F3" d="M4,12h26v24H4c-1.1,0-2-0.9-2-2V14C2,12.9,2.9,12,4,12z"/>
                    <path fill="#fff" d="M17,18c-3.9,0-7,3.1-7,7s3.1,7,7,7s7-3.1,7-7S20.9,18,17,18z M17,29c-2.2,0-4-1.8-4-4s1.8-4,4-4s4,1.8,4,4S19.2,29,17,29z"/>
                  </svg>
                </div>
              </div>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mb-lg max-w-2xl">
                Automatically forward invoices, receipts, and financial statements directly to FinPilot. Our AI extracts transaction data with 99.9% accuracy.
            </p>
          </div>
          <div className="flex items-center justify-between border-t border-outline-variant pt-lg">
            <div className="flex gap-xl">
              <div>
                <p className="font-label-caps text-label-caps text-on-surface-variant mb-xs uppercase">Status</p>
                <div className="flex items-center gap-xs">
                  <div className={`w-2 h-2 rounded-full ${connections.email ? 'bg-emerald-500 animate-pulse' : 'bg-outline'}`}></div>
                  <span className={`font-body-sm text-body-sm ${connections.email ? 'text-emerald-600 font-bold' : 'text-on-surface-variant'}`}>
                    {connections.email ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
              {connections.email && (
                <div className="animate-fade-in flex flex-col">
                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-xs uppercase">Connected Account</p>
                  {isEditingEmail ? (
                    <form onSubmit={handleEmailChange} className="flex items-center gap-xs">
                      <input 
                        name="email"
                        defaultValue={connectedEmail}
                        autoFocus
                        className="font-body-sm text-primary px-2 py-1 border border-primary rounded bg-primary/5 focus:outline-none w-40"
                      />
                      <button type="submit" className="material-symbols-outlined text-primary text-[18px] hover:scale-110 transition-transform">check</button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-sm">
                      <span className="font-body-sm text-body-sm text-primary font-medium">{connectedEmail}</span>
                      <button 
                        onClick={() => setIsEditingEmail(true)}
                        className="text-[10px] font-bold text-outline hover:text-primary transition-colors uppercase"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div>
                <p className="font-label-caps text-label-caps text-on-surface-variant mb-xs uppercase">Last Sync</p>
                <span className="font-body-sm text-body-sm text-on-surface-variant">{connections.email ? '2 minutes ago' : '—'}</span>
              </div>
            </div>
            <div className="flex items-center gap-sm">
              <button 
                onClick={() => toggleConnection('email', 'Email Ingestion')}
                className={`px-lg py-sm rounded-lg font-body-md font-bold transition-all ${connections.email ? 'bg-surface text-error border border-error hover:bg-error/5' : 'bg-primary text-on-primary hover:bg-primary-container shadow-sm'}`}
              >
                  {connections.email ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          </div>
        </div>}

        {/* Card 2: Mobile Sync (Always Active for demo) */}
        {isVisible('mobile') && <div className="md:col-span-4 bg-primary text-on-primary rounded-xl p-lg flex flex-col relative overflow-hidden shadow-lg border border-primary/20">
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-md">
              <div className="w-12 h-12 rounded-lg bg-on-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]" style={{fontVariationSettings: "'FILL' 1"}}>smartphone</span>
              </div>
              <span className="bg-white/20 px-sm py-1 rounded-full font-label-caps text-label-caps text-on-primary">ACTIVE</span>
            </div>
            <h3 className="font-headline-sm text-headline-sm mb-sm font-bold">Mobile Sync</h3>
            <p className="font-body-sm text-body-sm text-on-primary/80 mb-lg">
                Real-time transaction capture via the FinPilot mobile app. Receipt scanning enabled.
            </p>
            <div className="mt-auto pt-lg border-t border-white/20">
              <button 
                onClick={() => toast.success("Scanning for devices...")}
                className="w-full py-sm bg-white text-primary rounded-lg font-body-md font-bold hover:bg-white/90 transition-colors shadow-sm"
              >
                  View Devices
              </button>
            </div>
          </div>
          {/* Abstract Decorative Background */}
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
        </div>}

        {/* Card 3: Webhooks (Stripe/PayPal/Square) — visible if any sub-integration matches */}
        {(isVisible('stripe') || isVisible('paypal') || isVisible('square')) && <div className="md:col-span-12 bg-surface-container-low border border-outline-variant rounded-xl p-lg shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-lg">
            <div className="flex items-center gap-lg">
              <div className="w-14 h-14 rounded-lg bg-tertiary-container flex items-center justify-center text-on-tertiary-container">
                <span className="material-symbols-outlined text-[32px]">webhook</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Payment Webhooks</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Stripe, PayPal, and Square direct processing</p>
              </div>
            </div>
            <div className="flex items-center gap-xl">
              <div className="text-right hidden sm:block">
                <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">Active Endpoints</p>
                <p className="font-data-mono text-data-mono text-primary font-bold">
                  {Object.values(connections).filter(v => v).length} Active
                </p>
              </div>
              <button 
                onClick={() => toast("Settings updated.")}
                className="flex items-center gap-xs font-body-md font-bold text-primary hover:underline group"
              >
                  Manage
                  <span className="material-symbols-outlined text-body-md group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Sub-grid for specific webhooks */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-md mt-lg pt-lg border-t border-outline-variant">
            {/* Stripe */}
            {isVisible('stripe') && <div 
              onClick={() => toggleConnection('stripe', 'Stripe')}
              className={`flex items-center gap-sm p-md rounded-lg border cursor-pointer transition-all ${connections.stripe ? 'bg-surface-container-highest border-primary/50' : 'bg-surface-container-lowest border-outline-variant opacity-60'}`}
            >
              <span className={`material-symbols-outlined ${connections.stripe ? 'text-primary' : 'text-on-surface-variant'}`}>payments</span>
              <div className="flex-1">
                <p className="font-body-sm font-bold text-on-surface">Stripe</p>
                <p className="font-label-caps text-[10px] text-primary">{connections.stripe ? 'CONNECTED' : 'INACTIVE'}</p>
              </div>
              <div className={`w-2 h-2 rounded-full ${connections.stripe ? 'bg-emerald-500' : 'bg-outline'}`}></div>
            </div>}

            {/* PayPal */}
            {isVisible('paypal') && <div 
              onClick={() => toggleConnection('paypal', 'PayPal')}
              className={`flex items-center gap-sm p-md rounded-lg border cursor-pointer transition-all ${connections.paypal ? 'bg-surface-container-highest border-primary/50' : 'bg-surface-container-lowest border-outline-variant opacity-60'}`}
            >
              <span className={`material-symbols-outlined ${connections.paypal ? 'text-primary' : 'text-on-surface-variant'}`}>account_balance</span>
              <div className="flex-1">
                <p className="font-body-sm font-bold text-on-surface">PayPal</p>
                <p className="font-label-caps text-[10px] text-primary">{connections.paypal ? 'CONNECTED' : 'INACTIVE'}</p>
              </div>
              <div className={`w-2 h-2 rounded-full ${connections.paypal ? 'bg-emerald-500' : 'bg-outline'}`}></div>
            </div>}

            {/* Square */}
            {isVisible('square') && <div 
              onClick={() => toggleConnection('square', 'Square')}
              className={`flex items-center gap-sm p-md rounded-lg border cursor-pointer transition-all ${connections.square ? 'bg-surface-container-highest border-primary/50' : 'bg-surface-container-lowest border-outline-variant opacity-60'}`}
            >
              <span className={`material-symbols-outlined ${connections.square ? 'text-primary' : 'text-on-surface-variant'}`}>point_of_sale</span>
              <div className="flex-1">
                <p className="font-body-sm font-bold text-on-surface">Square</p>
                <p className="font-label-caps text-[10px] text-primary">{connections.square ? 'CONNECTED' : 'INACTIVE'}</p>
              </div>
              <div className={`w-2 h-2 rounded-full ${connections.square ? 'bg-emerald-500' : 'bg-outline'}`}></div>
            </div>}
          </div>
        </div>}

        {/* Quick Start Guide Section */}
        <div className="md:col-span-12 mt-xl">
          <div className="bg-surface border border-outline-variant rounded-2xl p-xl shadow-sm relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-sm mb-lg">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">auto_stories</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Quick Start Guide</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-lg">
                {/* Step 1 */}
                <div className="flex flex-col gap-sm">
                  <div className="flex items-center gap-md">
                    <span className="w-6 h-6 rounded-full bg-primary text-on-primary text-[12px] font-bold flex items-center justify-center">1</span>
                    <h4 className="font-body-md font-bold text-on-surface">Connect Email</h4>
                  </div>
                  <p className="font-body-sm text-on-surface-variant">Toggle the "Connect" button on Email Ingestion and set your primary finance mailbox.</p>
                </div>
                
                {/* Step 2 */}
                <div className="flex flex-col gap-sm">
                  <div className="flex items-center gap-md">
                    <span className="w-6 h-6 rounded-full bg-primary text-on-primary text-[12px] font-bold flex items-center justify-center">2</span>
                    <h4 className="font-body-md font-bold text-on-surface">Send an Invoice</h4>
                  </div>
                  <p className="font-body-sm text-on-surface-variant">Forward any PDF or Image invoice to your connected email. Our AI scans it instantly.</p>
                </div>
                
                {/* Step 3 */}
                <div className="flex flex-col gap-sm">
                  <div className="flex items-center gap-md">
                    <span className="w-6 h-6 rounded-full bg-primary text-on-primary text-[12px] font-bold flex items-center justify-center">3</span>
                    <h4 className="font-body-md font-bold text-on-surface">Review & Approve</h4>
                  </div>
                  <p className="font-body-sm text-on-surface-variant">Head to the <b>Review Queue</b> to verify the AI-extracted data and hit "Approve".</p>
                </div>
                
                {/* Step 4 */}
                <div className="flex flex-col gap-sm">
                  <div className="flex items-center gap-md">
                    <span className="w-6 h-6 rounded-full bg-primary text-on-primary text-[12px] font-bold flex items-center justify-center">4</span>
                    <h4 className="font-body-md font-bold text-on-surface">Ledger & Sync</h4>
                  </div>
                  <p className="font-body-sm text-on-surface-variant">Your transactions move to the <b>Ledger</b>, ready to be exported or synced to accounting.</p>
                </div>
              </div>
            </div>
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          </div>
        </div>

        {/* Footer: Contact Support */}
        <div className="md:col-span-12 flex items-center justify-between gap-md bg-secondary-container/30 border border-secondary-container rounded-xl p-md mt-lg shadow-sm">
          <div className="flex items-center gap-md">
            <span className="material-symbols-outlined text-primary">support_agent</span>
            <p className="font-body-sm text-body-sm text-on-secondary-container">
              Having trouble with an integration? Our support team is here to help.
            </p>
          </div>
          <a 
            href="mailto:support@finpilot.ai"
            className="flex items-center gap-xs px-md py-sm bg-primary text-on-primary rounded-lg font-body-sm font-bold hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px]">mail</span>
            Contact Support
          </a>
        </div>
      </div>
    </main>
  );
}
