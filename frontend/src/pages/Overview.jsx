import React from 'react';

export default function Overview() {
  return (
    <main className="p-margin-desktop max-w-[1280px]">
      {/* Header Section */}
      <div className="flex justify-between items-end mb-xl">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Overview</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Real-time financial intelligence and data extraction.</p>
        </div>
        <button className="bg-primary hover:bg-primary-fixed-dim text-on-primary px-lg py-md rounded-lg font-body-md font-bold flex items-center gap-sm transition-all shadow-sm">
          <span className="material-symbols-outlined" data-icon="add" style={{fontVariationSettings: "'FILL' 0, 'wght' 700"}}>add</span>
          New Extraction
        </button>
      </div>

      {/* Top Row: Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-xl">
        {/* Pending Review Card */}
        <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-label-caps font-label-caps text-on-surface-variant uppercase">Pending Review</span>
            <span className="material-symbols-outlined text-secondary" data-icon="pending_actions">pending_actions</span>
          </div>
          <div className="mt-md">
            <p className="text-[32px] font-bold text-on-surface">14</p>
            <p className="text-body-sm text-error flex items-center gap-xs font-medium">
              <span className="material-symbols-outlined text-[14px]" data-icon="priority_high">priority_high</span>
              Needs attention today
            </p>
          </div>
        </div>

        {/* Monthly Spend Card */}
        <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-label-caps font-label-caps text-on-surface-variant uppercase">Monthly Spend</span>
            <span className="material-symbols-outlined text-secondary" data-icon="payments">payments</span>
          </div>
          <div className="mt-md">
            <p className="text-[32px] font-bold text-on-surface">$12,482.00</p>
            <p className="text-body-sm text-on-surface-variant flex items-center gap-xs">
              <span className="material-symbols-outlined text-[14px] text-primary" data-icon="trending_up">trending_up</span>
              4.2% from last month
            </p>
          </div>
        </div>

        {/* Ready for Export Card */}
        <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-label-caps font-label-caps text-on-surface-variant uppercase">Ready for Export</span>
            <span className="material-symbols-outlined text-secondary" data-icon="file_upload">file_upload</span>
          </div>
          <div className="mt-md">
            <p className="text-[32px] font-bold text-on-surface">156</p>
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
              <button className="px-md py-xs bg-surface-container rounded text-label-caps font-label-caps border border-outline-variant">30 DAYS</button>
              <button className="px-md py-xs text-label-caps font-label-caps text-on-surface-variant">90 DAYS</button>
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
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 200">
                <path d="M0,150 L100,130 L200,160 L300,110 L400,120 L500,80 L600,90 L700,50 L800,60" fill="none" stroke="#3B82F6" strokeWidth="3"></path>
                <path d="M0,150 L100,130 L200,160 L300,110 L400,120 L500,80 L600,90 L700,50 L800,60 L800,200 L0,200 Z" fill="url(#chartGradient)" opacity="0.1"></path>
                <defs>
                  <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6"></stop>
                    <stop offset="100%" stopColor="transparent"></stop>
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute bottom-0 w-full flex justify-between text-[10px] text-on-surface-variant font-medium px-base">
                <span>AUG 01</span>
                <span>AUG 10</span>
                <span>AUG 20</span>
                <span>AUG 30</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Review Widget */}
        <div className="lg:col-span-4 space-y-gutter">
          <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl">
            <div className="flex items-center justify-between mb-md">
              <h3 className="font-headline-sm text-headline-sm">Next in Queue</h3>
              <span className="px-sm py-xs bg-error-container text-on-error-container text-[10px] font-bold rounded">URGENT</span>
            </div>
            <div className="relative group cursor-pointer overflow-hidden rounded-lg border border-outline-variant mb-md">
              <div className="w-full h-40 bg-surface-container flex items-center justify-center">
                <span className="material-symbols-outlined text-outline text-[40px]">receipt</span>
              </div>
              <div className="absolute inset-0 bg-on-surface/5 group-hover:bg-transparent transition-colors"></div>
              <div className="absolute bottom-md left-md bg-white/90 backdrop-blur-sm px-sm py-xs rounded text-[10px] font-bold text-on-surface border border-outline-variant shadow-sm">
                  $244.50 • Office Supplies
              </div>
            </div>
            <div className="space-y-sm">
              <p className="font-body-md font-semibold text-on-surface">Amazon Business Terminal</p>
              <p className="text-body-sm text-on-surface-variant">Captured via Mobile App • 2h ago</p>
              <button className="w-full mt-md bg-on-secondary-fixed text-white font-body-sm font-bold py-sm rounded-lg hover:bg-on-secondary-fixed-variant transition-colors">Review Item</button>
            </div>
          </div>
        </div>

        {/* Recent Activity List */}
        <div className="lg:col-span-12 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden mt-md">
          <div className="p-lg border-b border-outline-variant flex justify-between items-center">
            <h3 className="font-headline-sm text-headline-sm">Recent Activity</h3>
            <button className="text-primary font-body-sm font-bold hover:underline">View All Captures</button>
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
                {/* Mock Item 1 */}
                <tr className="border-b border-outline-variant hover:bg-primary-container/5 transition-colors group">
                  <td className="px-lg py-md flex items-center gap-sm">
                    <span className="material-symbols-outlined text-secondary" data-icon="description">description</span>
                    <span>United Airlines Receipt</span>
                  </td>
                  <td className="px-lg py-md text-on-surface-variant">Today, 10:42 AM</td>
                  <td className="px-lg py-md font-semibold font-data-mono text-data-mono">$1,120.40</td>
                  <td className="px-lg py-md">
                    <span className="px-sm py-xs bg-surface-container rounded text-[11px] font-medium border border-outline-variant">Travel</span>
                  </td>
                  <td className="px-lg py-md">
                    <span className="flex items-center gap-xs text-primary font-bold">
                      <span className="material-symbols-outlined text-[16px] animate-pulse" data-icon="autorenew">autorenew</span>
                      AI Processing
                    </span>
                  </td>
                  <td className="px-lg py-md text-right">
                    <button className="material-symbols-outlined text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" data-icon="more_vert">more_vert</button>
                  </td>
                </tr>
                
                {/* Mock Item 2 */}
                <tr className="border-b border-outline-variant hover:bg-primary-container/5 transition-colors group">
                  <td className="px-lg py-md flex items-center gap-sm">
                    <span className="material-symbols-outlined text-secondary" data-icon="mail">mail</span>
                    <span>Cloud Services Inc</span>
                  </td>
                  <td className="px-lg py-md text-on-surface-variant">Aug 28, 04:15 PM</td>
                  <td className="px-lg py-md font-semibold font-data-mono text-data-mono">$89.99</td>
                  <td className="px-lg py-md">
                    <span className="px-sm py-xs bg-surface-container rounded text-[11px] font-medium border border-outline-variant">Infrastructure</span>
                  </td>
                  <td className="px-lg py-md">
                    <span className="flex items-center gap-xs text-on-secondary-fixed-variant font-bold">
                      <span className="material-symbols-outlined text-[16px]" data-icon="pending">pending</span>
                      Pending Review
                    </span>
                  </td>
                  <td className="px-lg py-md text-right">
                    <button className="material-symbols-outlined text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" data-icon="more_vert">more_vert</button>
                  </td>
                </tr>

                {/* Mock Item 3 */}
                <tr className="border-b border-outline-variant hover:bg-primary-container/5 transition-colors group">
                  <td className="px-lg py-md flex items-center gap-sm">
                    <span className="material-symbols-outlined text-secondary" data-icon="camera_alt">camera_alt</span>
                    <span>Blue Bottle Coffee</span>
                  </td>
                  <td className="px-lg py-md text-on-surface-variant">Aug 28, 09:22 AM</td>
                  <td className="px-lg py-md font-semibold font-data-mono text-data-mono">$12.50</td>
                  <td className="px-lg py-md">
                    <span className="px-sm py-xs bg-surface-container rounded text-[11px] font-medium border border-outline-variant">Meals &amp; Ent.</span>
                  </td>
                  <td className="px-lg py-md">
                    <span className="flex items-center gap-xs text-[#065f46] font-bold">
                      <span className="material-symbols-outlined text-[16px]" data-icon="check_circle" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
                      Approved
                    </span>
                  </td>
                  <td className="px-lg py-md text-right">
                    <button className="material-symbols-outlined text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" data-icon="more_vert">more_vert</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
