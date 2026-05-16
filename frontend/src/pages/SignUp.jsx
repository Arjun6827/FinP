import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import toast from 'react-hot-toast';

export default function SignUp() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSignUp = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 12 || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      toast.error('Password must be at least 12 characters and include a symbol');
      return;
    }
    
    try {
      toast.loading('Creating account...', { id: 'signup' });
      await createUserWithEmailAndPassword(auth, email, password);
      toast.success('Account created successfully!', { id: 'signup' });
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to create account', { id: 'signup' });
    }
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
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Create Account</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">Sign up to start tracking your finances</p>
        </header>

        <form className="space-y-lg" onSubmit={handleSignUp}>
          {/* Email Field */}
          <div className="flex flex-col gap-xs">
            <label className="font-body-sm text-body-sm font-bold text-on-surface" htmlFor="email">Email Address *</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline" data-icon="mail">mail</span>
              <input 
                className="w-full pl-xl pr-md py-sm bg-surface border border-outline-variant rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md text-on-surface" 
                id="email" 
                name="email" 
                placeholder="name@company.com" 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-xs">
            <label className="font-body-sm text-body-sm font-bold text-on-surface" htmlFor="password">Password *</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline" data-icon="lock">lock</span>
              <input 
                className="w-full pl-xl pr-md py-sm bg-surface border border-outline-variant rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md text-on-surface" 
                id="password" 
                name="password" 
                placeholder="••••••••" 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="flex flex-col gap-xs">
            <label className="font-body-sm text-body-sm font-bold text-on-surface" htmlFor="confirmPassword">Confirm Password *</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline" data-icon="lock">lock</span>
              <input 
                className="w-full pl-xl pr-md py-sm bg-surface border border-outline-variant rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md text-on-surface" 
                id="confirmPassword" 
                name="confirmPassword" 
                placeholder="••••••••" 
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="p-md bg-[#f1f3f5] rounded-lg flex items-start gap-xs">
            <span className="material-symbols-outlined text-[#5c647a] text-[18px]">info</span>
            <p className="text-xs text-[#5c647a]">Passwords must be at least 12 characters and include a symbol.</p>
          </div>

          {/* Submit Button */}
          <button className="w-full py-md bg-primary text-on-primary font-body-md font-bold rounded-lg hover:bg-primary-container transition-all shadow-sm active:scale-[0.98]" type="submit">
            Create Account
          </button>
        </form>

        {/* Secondary Actions */}
        <div className="mt-xl pt-lg border-t border-outline-variant text-center">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Already have an account? 
            <Link className="text-primary font-bold hover:underline transition-colors ml-xs" to="/login">Sign In</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
