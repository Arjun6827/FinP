import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../firebase';

export default function ReviewQueue() {
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('needs_review'); // 'needs_review' or 'flagged'

  const [decryptedMap, setDecryptedMap] = useState({}); // docId -> decrypted data

  // Fetch decrypted data from Node.js backend (which holds the encryption key)
  const fetchDecryptedData = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/inbox');
      const json = await res.json();
      if (json.success) {
        const map = {};
        json.items.forEach(item => {
          map[item.id] = item.ocrResults?.[0]?.data || {};
        });
        setDecryptedMap(map);
      }
    } catch (err) {
      console.error('Failed to fetch decrypted inbox:', err);
    }
  };

  useEffect(() => {
    fetchDecryptedData();
    // Subscribe to the inbox collection based on viewMode
    const q = query(collection(db, 'inbox'), where('status', '==', viewMode));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort by timestamp descending
      items.sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0));
      setQueue(items);
      setLoading(false);
      // Refresh decrypted data whenever the queue changes
      fetchDecryptedData();
      // Reset index if it goes out of bounds
      if (currentIndex >= items.length && items.length > 0) {
        setCurrentIndex(0);
      }
    }, (error) => {
      console.error("Error fetching queue:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [viewMode]);

  const handleNext = () => {
    if (currentIndex < queue.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const vendorRef = useRef();
  const amountRef = useRef();
  const dateRef = useRef();
  const categoryRef = useRef();

  const handleApprove = async () => {
    if (!currentDoc) return;
    try {
      // Write the user-edited (plaintext) data back to Firestore as approved
      // Approved records use plain `data` field so Ledger can read them directly
      const updatedOcrResults = [...(currentDoc.ocrResults || [])];
      if (updatedOcrResults[0]) {
        updatedOcrResults[0].data = {
          vendor: vendorRef.current.value,
          amount: parseFloat(amountRef.current.value),
          date: dateRef.current.value,
          category: categoryRef.current.value,
          confidence: updatedOcrResults[0].confidence_score
        };
        // Remove encryptedData once user has reviewed and approved
        delete updatedOcrResults[0].encryptedData;
      }

      await updateDoc(doc(db, 'inbox', currentDoc.id), {
        status: 'approved',
        encrypted: false,   // plaintext after human review
        updatedAt: new Date(),
        ocrResults: updatedOcrResults
      });
      toast.success("Receipt approved and added to Ledger!");
    } catch (err) {
      console.error("Failed to approve:", err);
      toast.error("Approval failed.");
    }
  };

  const handleFlag = async () => {
    if (!currentDoc) return;
    try {
      const newStatus = viewMode === 'flagged' ? 'needs_review' : 'flagged';
      await updateDoc(doc(db, 'inbox', currentDoc.id), {
        status: newStatus,
        updatedAt: new Date(),
        ...(newStatus === 'flagged' ? { flaggedAt: new Date() } : {})
      });
      toast(newStatus === 'flagged' ? "Item flagged for review" : "Item moved back to pending", {
        icon: newStatus === 'flagged' ? '🚩' : '🔄',
      });
    } catch (err) {
      console.error("Failed to toggle flag:", err);
      toast.error("Flag action failed.");
    }
  };

  const handleDelete = async () => {
    if (!currentDoc) return;
    try {
      await deleteDoc(doc(db, 'inbox', currentDoc.id));
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  if (loading) {
    return <main className="min-h-[calc(100vh-64px)] p-margin-desktop bg-surface flex items-center justify-center"><p className="font-headline-sm text-on-surface-variant">Loading queue...</p></main>;
  }

  if (queue.length === 0) {
    return (
      <main className="min-h-[calc(100vh-64px)] p-margin-desktop bg-surface flex flex-col items-center justify-center gap-md">
        <div className="flex items-center gap-xl mb-lg">
           <div className="bg-surface-container-low p-xs rounded-lg flex border border-outline-variant">
            <button 
              onClick={() => {setViewMode('needs_review'); setCurrentIndex(0);}}
              className={`px-md py-xs rounded-md font-label-caps text-[10px] transition-all ${viewMode === 'needs_review' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'}`}
            >
              PENDING
            </button>
            <button 
              onClick={() => {setViewMode('flagged'); setCurrentIndex(0);}}
              className={`px-md py-xs rounded-md font-label-caps text-[10px] transition-all ${viewMode === 'flagged' ? 'bg-error text-on-error shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'}`}
            >
              FLAGGED
            </button>
          </div>
        </div>
        <span className="material-symbols-outlined text-[64px] text-surface-variant">
          {viewMode === 'flagged' ? 'flag_circle' : 'task_alt'}
        </span>
        <h2 className="font-headline-md text-on-surface">
          {viewMode === 'flagged' ? 'No flagged items' : "You're all caught up!"}
        </h2>
        <p className="font-body-md text-on-surface-variant">
          {viewMode === 'flagged' ? 'Items you flag will appear here for later review.' : 'No pending receipts to review.'}
        </p>
      </main>
    );
  }

  const currentDoc = queue[currentIndex];
  // 🔓 Use backend-decrypted data if available, fallback to raw data for legacy docs
  const ocrData = decryptedMap[currentDoc.id] || currentDoc.ocrResults?.[0]?.data || {};
  const filename = currentDoc.ocrResults?.[0]?.filename || currentDoc.attachments?.[0] || 'Unknown Document';
  const confidence = currentDoc.ocrResults?.[0]?.confidence_score || 0.95;

  return (
    <main className="min-h-[calc(100vh-64px)] p-margin-desktop bg-surface">
      {/* Queue Header Control */}
      <div className="flex justify-between items-center mb-lg">
        <div className="flex items-center gap-xl">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface">Review Queue</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {viewMode === 'flagged' ? 'Reviewing Flagged Items' : 'Pending verification'} ({queue.length} items)
            </p>
          </div>
          <div className="bg-surface-container-low p-xs rounded-lg flex border border-outline-variant">
            <button 
              onClick={() => {setViewMode('needs_review'); setCurrentIndex(0);}}
              className={`px-md py-xs rounded-md font-label-caps text-[10px] transition-all ${viewMode === 'needs_review' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'}`}
            >
              PENDING
            </button>
            <button 
              onClick={() => {setViewMode('flagged'); setCurrentIndex(0);}}
              className={`px-md py-xs rounded-md font-label-caps text-[10px] transition-all ${viewMode === 'flagged' ? 'bg-error text-on-error shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'}`}
            >
              FLAGGED
            </button>
          </div>
        </div>
        <div className="flex items-center gap-sm">
          <button onClick={handlePrev} disabled={currentIndex === 0} className={`flex items-center gap-xs px-md py-sm border border-outline-variant rounded-lg transition-colors text-body-md font-bold ${currentIndex === 0 ? 'opacity-50 cursor-not-allowed bg-surface' : 'bg-surface hover:bg-surface-container'}`}>
            <span className="material-symbols-outlined">chevron_left</span>
            Previous
          </button>
          <button onClick={handleNext} disabled={currentIndex === queue.length - 1} className={`flex items-center gap-xs px-md py-sm border border-outline-variant rounded-lg transition-colors text-body-md font-bold ${currentIndex === queue.length - 1 ? 'opacity-50 cursor-not-allowed bg-surface' : 'bg-surface hover:bg-surface-container'}`}>
            Next
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>

      {/* 2-Column Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter items-start h-[calc(100vh-220px)]">
        
        {/* Left Column: Receipt Viewer */}
        <div className="h-full border border-outline-variant rounded-xl bg-surface-container-lowest overflow-hidden flex flex-col relative group">
          <div className="absolute bottom-md right-md flex flex-col gap-sm z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => setZoom(prev => Math.min(prev + 0.2, 3))}
              className="bg-surface/80 backdrop-blur-md p-xs rounded-lg border border-outline-variant text-on-surface shadow-sm hover:bg-surface transition-all"
            >
              <span className="material-symbols-outlined">zoom_in</span>
            </button>
            <button 
              onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.5))}
              className="bg-surface/80 backdrop-blur-md p-xs rounded-lg border border-outline-variant text-on-surface shadow-sm hover:bg-surface transition-all"
            >
              <span className="material-symbols-outlined">zoom_out</span>
            </button>
            <button 
              onClick={() => setZoom(1)}
              className="bg-surface/80 backdrop-blur-md p-xs rounded-lg border border-outline-variant text-on-surface shadow-sm hover:bg-surface transition-all"
            >
              <span className="material-symbols-outlined">restart_alt</span>
            </button>
          </div>
          <div className="p-md border-b border-outline-variant bg-surface flex justify-between items-center">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Source: {filename}</span>
            <span className={`px-sm py-xs text-on-secondary-container text-[10px] font-bold rounded uppercase ${confidence > 0.9 ? 'bg-secondary-container' : 'bg-amber-200 text-amber-900'}`}>
              {confidence > 0.9 ? 'High Confidence' : 'Medium Confidence'} ({Math.round(confidence * 100)}%)
            </span>
          </div>
          <div className="flex-1 bg-[#F1F3F5] relative overflow-auto rounded-b-xl flex justify-center items-start">
            <div 
              className="w-full h-full transition-all duration-200 origin-top"
              style={{ 
                transform: `scale(${zoom})`, 
                width: zoom > 1 ? `${zoom * 100}%` : '100%',
                height: zoom > 1 ? `${zoom * 100}%` : '100%',
                minHeight: '100%'
              }}
            >
              {currentDoc.ocrResults?.[0]?.fileUrl || currentDoc.attachments?.[0]?.url ? (
                (currentDoc.ocrResults?.[0]?.fileUrl || '').toLowerCase().endsWith('.pdf') ? (
                  <iframe 
                    src={`${currentDoc.ocrResults[0].fileUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                    className="w-full h-full border-0 min-h-[inherit]"
                    title="PDF Preview"
                  />
                ) : (
                  <div className="w-full h-full flex justify-center items-start p-xl">
                    <img 
                      src={currentDoc.ocrResults?.[0]?.fileUrl || currentDoc.attachments?.[0]?.url} 
                      alt="Receipt Preview" 
                      className="max-w-full h-auto shadow-xl"
                    />
                  </div>
                )
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-sm opacity-40">
                  <span className="material-symbols-outlined text-[48px]">image_not_supported</span>
                  <span className="text-on-surface-variant font-body-sm">Preview Unavailable</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: AI Extraction Form */}
        <div className="h-full border border-outline-variant rounded-xl bg-surface-container-lowest flex flex-col shadow-sm">
          <div className="p-md border-b border-outline-variant bg-surface">
            <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary" style={{fontVariationSettings: "'FILL' 1"}}>smart_toy</span>
              AI Extraction Data
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-lg space-y-lg">
            {/* Form Fields */}
            <div className="space-y-md">
              <div className="grid grid-cols-1 gap-sm">
                <label className="font-body-sm text-body-sm font-bold text-on-surface">Vendor Name</label>
                <div className="relative group">
                  <input ref={vendorRef} className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none" type="text" defaultValue={ocrData.vendor || ''} key={`vendor-${currentDoc.id}`}/>
                  {confidence > 0.9 && (
                    <div className="absolute right-md top-1/2 -translate-y-1/2 flex gap-xs">
                      <span className="material-symbols-outlined text-emerald-600 text-sm" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-gutter">
                <div className="space-y-sm">
                  <label className="font-body-sm text-body-sm font-bold text-on-surface">Amount ($)</label>
                  <input ref={amountRef} className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none font-data-mono text-data-mono" type="text" defaultValue={ocrData.amount || ''} key={`amount-${currentDoc.id}`}/>
                </div>
                <div className="space-y-sm">
                  <label className="font-body-sm text-body-sm font-bold text-on-surface">Category</label>
                  <div className="relative">
                    <select ref={categoryRef} className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none appearance-none" defaultValue={ocrData.category || ''} key={`cat-${currentDoc.id}`}>
                      <option value="Food & Dining">Food & Dining</option>
                      <option value="Travel">Travel</option>
                      <option value="Software & SaaS">Software & SaaS</option>
                      <option value="Office Supplies">Office Supplies</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Meals & Entertainment">Meals & Entertainment</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-md top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
                  </div>
                </div>
              </div>
              <div className="space-y-sm">
                <label className="font-body-sm text-body-sm font-bold text-on-surface">Date</label>
                <div className="relative">
                  <input ref={dateRef} className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none" type="text" defaultValue={ocrData.date || ''} key={`date-${currentDoc.id}`}/>
                  <span className="material-symbols-outlined absolute right-md top-1/2 -translate-y-1/2 text-on-surface-variant">calendar_today</span>
                </div>
              </div>

              {/* Line Items Preview */}
              {ocrData.line_items && ocrData.line_items.length > 0 && (
                <div className="space-y-sm mt-md">
                  <label className="font-body-sm text-body-sm font-bold text-on-surface">Detected Line Items</label>
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
                    {ocrData.line_items.map((item, idx) => (
                      <div key={idx} className="flex justify-between p-sm border-b border-outline-variant last:border-0 text-body-sm">
                        <span>{item.description}</span>
                        <span className="font-data-mono">${item.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Validation Messages */}
            {confidence < 0.9 && (
              <div className="p-md bg-amber-50 border border-amber-200 rounded-lg flex gap-md mt-lg">
                <span className="material-symbols-outlined text-amber-600">warning</span>
                <div className="space-y-xs">
                  <p className="font-body-sm text-body-sm font-bold text-amber-900">Low Confidence Warning</p>
                  <p className="font-body-sm text-body-sm text-amber-800">The AI was not highly confident in its extraction. Please manually review the fields against the receipt.</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="p-lg border-t border-outline-variant bg-surface flex justify-between items-center gap-md mt-auto">
            <button onClick={handleDelete} className="flex items-center gap-xs text-error font-body-md text-body-md font-bold hover:bg-error-container p-sm rounded-lg transition-colors">
              <span className="material-symbols-outlined">delete</span>
              Delete
            </button>
            <div className="flex items-center gap-md">
              <button 
                onClick={handleFlag} 
                className={`px-lg py-sm border border-outline-variant rounded-lg bg-surface font-body-md text-body-md font-bold transition-colors ${viewMode === 'flagged' ? 'text-primary hover:bg-secondary-container' : 'text-on-surface hover:bg-surface-container'}`}
              >
                {viewMode === 'flagged' ? 'Unflag' : 'Flag'}
              </button>
              <button onClick={handleApprove} className="px-xl py-sm bg-primary text-on-primary rounded-lg font-body-md text-body-md font-bold hover:brightness-110 shadow-sm transition-all flex items-center gap-xs">
                <span className="material-symbols-outlined">check</span>
                Approve
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
