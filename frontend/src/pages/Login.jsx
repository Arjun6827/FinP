import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // Simulate auth, then redirect to dashboard
    navigate('/dashboard');
  };

  return (
    <main className="w-full max-w-[440px] flex flex-col items-center">
      {/* Brand Identity */}
      <div className="mb-xl text-center">
        <div className="flex items-center justify-center mb-sm">
          <span className="material-symbols-outlined text-primary text-[40px]" data-icon="account_balance">account_balance</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">FinPilot</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">AI Financial Partner</p>
      </div>

      {/* Auth Card */}
      <div className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-lg md:p-xl shadow-sm">
        <header className="mb-lg">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Sign In</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">Enter your credentials to access your dashboard</p>
        </header>

        <form className="space-y-lg" onSubmit={handleLogin}>
          {/* Email Field */}
          <div className="flex flex-col gap-xs">
            <label className="font-body-sm text-body-sm font-bold text-on-surface" htmlFor="email">Email Address</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline" data-icon="mail">mail</span>
              <input className="w-full pl-xl pr-md py-sm bg-surface border border-outline-variant rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md text-on-surface" id="email" name="email" placeholder="name@company.com" type="email"/>
            </div>
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-xs">
            <div className="flex justify-between items-center">
              <label className="font-body-sm text-body-sm font-bold text-on-surface" htmlFor="password">Password</label>
              <a className="font-body-sm text-body-sm text-primary hover:underline transition-colors" href="#">Forgot password?</a>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline" data-icon="lock">lock</span>
              <input className="w-full pl-xl pr-xl py-sm bg-surface border border-outline-variant rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md text-on-surface" id="password" name="password" placeholder="••••••••" type="password"/>
              <button className="absolute right-md top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors" type="button">
                <span className="material-symbols-outlined" data-icon="visibility">visibility</span>
              </button>
            </div>
          </div>

          {/* Remember Me & State */}
          <div className="flex items-center">
            <input className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary focus:ring-offset-0" id="remember" name="remember" type="checkbox"/>
            <label className="ml-sm font-body-sm text-body-sm text-on-surface-variant cursor-pointer" htmlFor="remember">Keep me logged in</label>
          </div>

          {/* Submit Button */}
          <button className="w-full py-md bg-primary text-on-primary font-body-md font-bold rounded-lg hover:bg-primary-container transition-all shadow-sm active:scale-[0.98]" type="submit">
            Sign In
          </button>
        </form>

        {/* Secondary Actions */}
        <div className="mt-xl pt-lg border-t border-outline-variant text-center">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Don't have an account? 
            <a className="text-primary font-bold hover:underline transition-colors ml-xs" href="#">Create an account</a>
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="mt-lg flex flex-col items-center gap-sm">
        <div className="flex items-center gap-md">
          <a className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors" href="#">Privacy Policy</a>
          <span className="w-1 h-1 bg-outline-variant rounded-full"></span>
          <a className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors" href="#">Terms of Service</a>
          <span className="w-1 h-1 bg-outline-variant rounded-full"></span>
          <a className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors" href="#">Security</a>
        </div>
        <div className="flex items-center gap-xs text-outline font-body-sm">
          <span className="material-symbols-outlined text-[16px]" data-icon="verified_user">verified_user</span>
          <span className="text-[11px] uppercase tracking-widest font-bold">Bank-Grade Encryption</span>
        </div>
      </footer>
    </main>
  );
}
