import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../firebase';
import Tooltip from '../components/Tooltip';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Listen for items needing review
    const q = query(collection(db, 'inbox'), where('status', '==', 'needs_review'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newCount = snapshot.size;
      
      // If count increased, show a notification
      if (newCount > pendingCount && pendingCount !== 0) {
        toast("New invoice extracted and ready for review!", {
          icon: '📩',
          duration: 4000,
          position: 'top-right'
        });
      }
      
      setPendingCount(newCount);
    });
    
    return () => unsubscribe();
  }, [pendingCount]);

  const handleNotifications = () => {
    if (pendingCount > 0) {
      toast(`You have ${pendingCount} items waiting in your Review Queue.`, {
        icon: '🔔',
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
    } else {
      toast.success("All caught up! No new notifications.");
    }
  };

  return (
    <div className="bg-background text-on-surface min-h-screen">
      {/* SideNavBar Anchor */}
      <aside className="fixed left-0 top-0 h-screen flex flex-col p-md bg-surface border-r border-outline-variant w-64 z-50">
        <div className="flex items-center gap-sm mb-xl">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary" style={{fontVariationSettings: "'FILL' 1"}}>account_balance_wallet</span>
          </div>
          <div>
            <h1 className="font-headline-sm text-headline-sm font-bold text-on-surface">FinPilot</h1>
            <p className="text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">AI Financial Partner</p>
          </div>
        </div>
        
        <nav className="flex-1 space-y-base">
          <NavLink 
            to="/dashboard" 
            end
            className={({isActive}) => `flex items-center gap-md p-md font-body-md text-body-md rounded-lg cursor-pointer duration-200 ${isActive ? 'text-primary font-bold bg-secondary-container' : 'text-on-surface-variant hover:bg-surface-container-low transition-colors'}`}
          >
            <span className="material-symbols-outlined" data-icon="dashboard">dashboard</span>
            <span>Overview</span>
          </NavLink>
          <NavLink 
            to="/review" 
            className={({isActive}) => `flex items-center gap-md p-md font-body-md text-body-md rounded-lg cursor-pointer duration-200 ${isActive ? 'text-primary font-bold bg-secondary-container' : 'text-on-surface-variant hover:bg-surface-container-low transition-colors'}`}
          >
            <span className="material-symbols-outlined" data-icon="fact_check">fact_check</span>
            <span>Review Queue</span>
          </NavLink>
          <NavLink 
            to="/ledger" 
            className={({isActive}) => `flex items-center gap-md p-md font-body-md text-body-md rounded-lg cursor-pointer duration-200 ${isActive ? 'text-primary font-bold bg-secondary-container' : 'text-on-surface-variant hover:bg-surface-container-low transition-colors'}`}
          >
            <span className="material-symbols-outlined" data-icon="account_balance_wallet">account_balance_wallet</span>
            <span>Ledger</span>
          </NavLink>
          <NavLink 
            to="/forecast" 
            className={({isActive}) => `flex items-center gap-md p-md font-body-md text-body-md rounded-lg cursor-pointer duration-200 ${isActive ? 'text-primary font-bold bg-secondary-container' : 'text-on-surface-variant hover:bg-surface-container-low transition-colors'}`}
          >
            <span className="material-symbols-outlined" data-icon="monitoring">monitoring</span>
            <span>Forecast</span>
          </NavLink>
          <NavLink 
            to="/integrations" 
            className={({isActive}) => `flex items-center gap-md p-md font-body-md text-body-md rounded-lg cursor-pointer duration-200 ${isActive ? 'text-primary font-bold bg-secondary-container' : 'text-on-surface-variant hover:bg-surface-container-low transition-colors'}`}
          >
            <span className="material-symbols-outlined" data-icon="hub">hub</span>
            <span>Integrations</span>
          </NavLink>
          <NavLink 
            to="/settings" 
            className={({isActive}) => `flex items-center gap-md p-md font-body-md text-body-md rounded-lg cursor-pointer duration-200 ${isActive ? 'text-primary font-bold bg-secondary-container' : 'text-on-surface-variant hover:bg-surface-container-low transition-colors'}`}
          >
            <span className="material-symbols-outlined" data-icon="settings">settings</span>
            <span>Settings</span>
          </NavLink>
        </nav>
      </aside>

      {/* TopNavBar Anchor */}
      <header className="flex justify-between items-center h-16 px-margin-desktop sticky top-0 z-40 bg-surface ml-64 border-b border-outline-variant">
        <div className="flex-1">
          {/* Spacer for where search was */}
        </div>
        <div className="flex items-center gap-lg">
          <Tooltip text={pendingCount > 0 ? `${pendingCount} items need review` : 'No new notifications'} position="bottom">
            <button onClick={handleNotifications} className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors relative" data-icon="notifications">
              notifications
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-error text-[10px] text-white flex items-center justify-center rounded-full border border-surface font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          </Tooltip>

          <Tooltip text="Quick Start Guide" position="bottom">
            <button onClick={() => { navigate('/integrations'); toast.success("Opening Quick Start Guide!", { icon: '💡' }); }} className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors" data-icon="help_outline">help_outline</button>
          </Tooltip>
          
          <div className="relative">
            <Tooltip text="Account & Settings" position="bottom">
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="h-8 w-8 rounded-full overflow-hidden border border-outline bg-surface-variant hover:ring-2 hover:ring-primary/20 transition-all"
              >
                <img alt="User profile" src="https://ui-avatars.com/api/?name=Fin+Pilot&background=0058be&color=fff" />
              </button>
            </Tooltip>

            {showProfileMenu && (
              <div className="absolute right-0 mt-md w-48 bg-surface border border-outline-variant rounded-xl shadow-lg py-sm z-50 animate-fade-in">
                <div className="px-md py-sm border-b border-outline-variant mb-xs">
                  <p className="font-body-sm font-bold text-on-surface">Fin Pilot</p>
                  <p className="text-[10px] text-on-surface-variant">finpilot700@gmail.com</p>
                </div>
                <button onClick={() => {setShowProfileMenu(false); navigate('/settings')}} className="w-full text-left px-md py-sm text-body-sm text-on-surface-variant hover:bg-surface-container-low transition-colors flex items-center gap-sm">
                  <span className="material-symbols-outlined text-[18px]">settings</span>
                  Settings
                </button>
                <button onClick={() => {setShowProfileMenu(false); navigate('/login')}} className="w-full text-left px-md py-sm text-body-sm text-error hover:bg-error/5 transition-colors flex items-center gap-sm">
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="ml-64">
        <Outlet />
      </div>
    </div>
  );
}
