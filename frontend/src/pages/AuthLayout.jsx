import React from 'react';
import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="bg-background text-on-background min-h-screen flex items-center justify-center p-margin-mobile md:p-margin-desktop font-body-md relative overflow-hidden">
      
      <Outlet />

      {/* Background Abstract Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-secondary-container/10 rounded-full blur-[120px]"></div>
        
        {/* Illustration/Mood Image */}
        <div className="absolute bottom-margin-desktop left-margin-desktop hidden lg:block opacity-40">
          <div className="w-64 h-64 border border-outline-variant rounded-xl overflow-hidden grayscale">
            <img 
              alt="Financial abstraction" 
              className="w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAJyf-Upij2dR0Jom6_L_GBb0vMEpkytz215_C1SOdmCneY4nchOFTZLISoFrzHvVPD58ao4bnufEEbHJ27OkeqEgCCV-MmQiiIhNEQD0iaCi1_ScmdVCNotbl2hXp3qYYx7Nj0dFiUQ0JUas93aJ0dJYTZ0LHMGm3yVdQVa3p82P_rr0redEpXWx8gEpGlz323UgUmfz_8VLkNU6FLOQhvDvQkvfsK6tAwpN-rVMfMx3enRqK9otV3ZuDny_GsnGhqdR_jr6608Qs"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
