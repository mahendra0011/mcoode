import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import robotBg from '../assets/robot-bg-new.png';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-white font-sans relative flex flex-col items-center lg:items-end justify-center p-4 lg:pr-[10%] xl:pr-[15%] overflow-hidden">
      
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none bg-cover bg-[center_40%] bg-no-repeat"
        style={{ backgroundImage: `url(${robotBg})` }}
      />

      {/* Top Left Navigation */}
      <div className="absolute top-8 left-8 z-20 flex items-center gap-6">
        <Link to="/login" className="text-zinc-900 font-bold text-sm hover:opacity-70 transition-opacity">
          Login
        </Link>
        <Link to="/signup" className="bg-[#4ade80] text-white font-bold text-sm px-6 py-2.5 rounded-full shadow-md shadow-green-500/20 hover:bg-[#22c55e] transition-colors">
          Create Account
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-[420px] pt-10 pb-10">
        
        {/* White Glassmorphism Form Card */}
        <div className="bg-white rounded-[2rem] p-10 shadow-2xl relative overflow-hidden">
          
          <div className="text-center mb-8">
            <h1 className="text-[28px] font-bold text-zinc-900 leading-tight mb-3">
              Forgot <span className="text-[#22c55e]">Password</span>
            </h1>
            <p className="text-zinc-500 text-sm font-medium leading-relaxed px-2">
              Enter your email and we'll send you a link to reset your password.
            </p>
          </div>

          {!submitted ? (
            <form className="space-y-4" onSubmit={submit}>
              
              {/* Email Field */}
              <div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#eff4fb] border border-transparent rounded-xl py-3.5 px-4 text-zinc-900 placeholder:text-zinc-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                  placeholder="Email Address"
                  required
                />
              </div>
              
              {/* Submit Button */}
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-white py-3.5 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-green-500/20 mt-4 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-zinc-900 mb-2">Check your email</h3>
              <p className="text-sm text-zinc-500 mb-6">
                We've sent a password reset link to {email}
              </p>
              <button 
                onClick={() => navigate('/login')}
                className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-900 py-3.5 rounded-xl font-bold text-sm transition-colors"
              >
                Back to Login
              </button>
            </div>
          )}

          {/* Footer Link */}
          {!submitted && (
            <p className="text-center mt-8 text-sm text-zinc-500 font-medium">
              Remember your password?{' '}
              <Link to="/login" className="text-[#22c55e] font-bold hover:text-green-600 hover:underline transition-all">
                Login
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
