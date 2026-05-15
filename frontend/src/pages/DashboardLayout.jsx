import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

export default function DashboardLayout() {
  const navigate = useNavigate();

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
        </nav>
        
        <div className="mt-auto pt-md space-y-base border-t border-outline-variant">
          <button onClick={() => navigate('/login')} className="w-full flex items-center gap-md p-md text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer duration-200">
            <span className="material-symbols-outlined" data-icon="logout">logout</span>
            <span className="font-body-md text-body-md">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* TopNavBar Anchor */}
      <header className="flex justify-between items-center h-16 px-margin-desktop sticky top-0 z-40 bg-surface ml-64">
        <div className="flex items-center bg-surface-container-low px-md py-xs rounded-full border border-outline-variant w-96">
          <span className="material-symbols-outlined text-on-surface-variant mr-sm" data-icon="search">search</span>
          <input className="bg-transparent border-none focus:ring-0 text-body-sm font-body-sm w-full outline-none" placeholder="Search transactions, receipts..." type="text"/>
        </div>
        <div className="flex items-center gap-lg">
          <button className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors" data-icon="notifications">notifications</button>
          <button className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors" data-icon="help_outline">help_outline</button>
          <div className="h-8 w-8 rounded-full overflow-hidden border border-outline bg-surface-variant">
            {/* User profile image placeholder */}
            <img alt="User profile" src="https://ui-avatars.com/api/?name=Fin+Pilot&background=0058be&color=fff" />
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
