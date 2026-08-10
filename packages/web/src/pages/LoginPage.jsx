import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import robotBg from '../assets/robot-bg-new.png';
import api from '../lib/axios';

const MotionLink = motion.create(Link);

const formVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.3 } }
};

export function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Passwordless / OTP login mode
  const [otpMode, setOtpMode] = useState(false);
  const [otpStep, setOtpStep] = useState(false); // false = enter email, true = enter code
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [devOtp, setDevOtp] = useState(null);

  const sendOtp = async () => {
    if (!form.email) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/v1/auth/send-otp', { email: form.email });
      if (res.status >= 400) {
        throw new Error(res.data?.error?.message || 'Failed to send code');
      }
      setDevOtp(res.data.devOtp || null);
      setOtpStep(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/v1/auth/verify-otp', { email: form.email, otp });
      if (res.status >= 400) {
        throw new Error(res.data?.error?.message || 'Invalid code');
      }
      localStorage.setItem('mcode_tokens', JSON.stringify({ access: res.data.access, refresh: res.data.refresh }));
      navigate('/ai/chat');
    } catch (err) {
      setOtpError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const otpBoxVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/v1/auth/login', { email: form.email, password: form.password });
      if (res.status >= 400) {
        throw new Error(res.data?.error?.message || 'Login failed');
      }
      localStorage.setItem('mcode_tokens', JSON.stringify({ access: res.data.access, refresh: res.data.refresh }));
      navigate('/ai/chat');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-white font-sans relative flex flex-col items-center lg:items-end justify-center p-4 lg:pr-[10%] xl:pr-[15%] overflow-hidden">
      
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none bg-cover bg-[center_40%] bg-no-repeat"
        style={{ backgroundImage: `url(${robotBg})` }}
      />

      {/* Top Left Navigation */}
      <motion.div
        className="absolute top-8 left-8 z-20 flex items-center gap-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <MotionLink
          to="/login"
          className="bg-[#4ade80] text-white font-bold text-sm px-6 py-2.5 rounded-full shadow-md shadow-green-500/20"
          whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(74, 222, 128, 0.5)' }}
          whileTap={{ scale: 0.97 }}
        >
          Login
        </MotionLink>
        <MotionLink
          to="/signup"
          className="text-zinc-900 font-bold text-sm"
          whileHover={{ opacity: 0.7 }}
          transition={{ duration: 0.2 }}
        >
          Create Account
        </MotionLink>
      </motion.div>

      <div className="relative z-10 w-full max-w-[420px] pt-10 pb-10">
        {/* White Glassmorphism Form Card */}
        <motion.div
          className="bg-white rounded-[2rem] p-10 shadow-2xl relative overflow-hidden"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
        >
          
          <div className="text-center mb-8">
            <motion.h1
              className="text-[28px] font-bold text-zinc-900 leading-tight mb-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              Welcome{' '}
              <motion.span
                className="text-[#22c55e]"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
              >
                Back
              </motion.span>
            </motion.h1>
            <motion.p
              className="text-zinc-500 text-sm font-medium leading-relaxed px-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Log in to your account to continue building.
            </motion.p>
          </div>

          {/* Error Display */}
          {error && (
            <motion.div
              className="p-3 bg-red-100 border border-red-300 text-red-800 text-sm rounded-xl mb-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              {error}
            </motion.div>
          )}

          {/* Mode Toggle: Password vs Passwordless */}
          <div className="flex items-center justify-center gap-2 p-1 bg-zinc-100 rounded-xl mb-6">
            <motion.button
              type="button"
              onClick={() => { setOtpMode(false); setOtpStep(false); setOtp(''); setOtpError(''); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${!otpMode ? 'bg-white text-green-600 shadow' : 'text-zinc-500 hover:text-zinc-800'}`}
              whileTap={{ scale: 0.97 }}
            >
              Password
            </motion.button>
            <motion.button
              type="button"
              onClick={() => { setOtpMode(true); setOtpStep(false); setOtp(''); setOtpError(''); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${otpMode ? 'bg-white text-green-600 shadow' : 'text-zinc-500 hover:text-zinc-800'}`}
              whileTap={{ scale: 0.97 }}
            >
              Send Code
            </motion.button>
          </div>

          {/* Login Form */}
          <motion.form
            className="space-y-4"
            onSubmit={async (e) => { e.preventDefault(); otpMode ? (otpStep ? verifyOtp() : sendOtp()) : submit(e); }}
            variants={formVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Email Field */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-[#eff4fb] border border-transparent rounded-xl py-3.5 px-4 text-zinc-900 placeholder:text-zinc-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                placeholder="Email Address"
                required
              />
            </motion.div>

            {/* Password Mode: Password Field */}
            {!otpMode && (
              <motion.div
                className="relative"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
              >
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-[#eff4fb] border border-transparent rounded-xl py-3.5 pl-4 pr-11 text-zinc-900 placeholder:text-zinc-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                  placeholder="Password"
                  required
                />
                <motion.button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors"
                  whileTap={{ scale: 0.85 }}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </motion.button>
              </motion.div>
            )}

            {/* Forgot Password (only in password mode) */}
            {!otpMode && (
              <motion.div
                className="text-right"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Link to="/forgot-password" className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors">
                  Forgot password?
                </Link>
              </motion.div>
            )}

            {/* OTP Mode: after sending code, show 6 input boxes */}
            {otpMode && otpStep && (
              <>
                <motion.div
                  className="flex items-center justify-center gap-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <input
                      key={idx}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={otp[idx] || ''}
                      onChange={(e) => {
                        const newOtp = otp.split('');
                        newOtp[idx] = e.target.value.slice(0, 1);
                        setOtp(newOtp.join(''));
                        if (e.target.value && idx < 5) {
                          const inputs = document.querySelectorAll('input[maxlength="1"]');
                          inputs[idx + 1]?.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
                          const inputs = document.querySelectorAll('input[maxlength="1"]');
                          inputs[idx - 1]?.focus();
                        }
                      }}
                      className="w-12 h-12 bg-[#eff4fb] border border-zinc-300 rounded-xl text-center text-xl font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                    />
                  ))}
                </motion.div>

                {otpError && <p className="text-xs text-red-500 text-center">{otpError}</p>}

                {devOtp && (
                  <p className="text-center text-xs text-zinc-500">Dev code: <span className="font-mono font-bold">{devOtp}</span></p>
                )}
              </>
            )}

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading || (otpMode && !otpStep && !form.email) || (otpStep && !loading && otp.length !== 6)}
              className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-green-500/20 mt-4 disabled:opacity-50 flex items-center justify-center gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading && <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}><Eye className="w-4 h-4" /></motion.div>}
              {loading ? 'Loading...' : otpMode ? (otpStep ? 'Verify Code' : 'Send Verification Code') : 'Login'}
            </motion.button>
          </motion.form>

          {/* Divider */}
          <motion.div
            className="mt-8 mb-6 flex items-center before:flex-1 before:border-t before:border-zinc-200 after:flex-1 after:border-t after:border-zinc-200"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
          >
            <span className="px-4 text-[11px] text-zinc-400 font-bold uppercase tracking-wider">or continue with</span>
          </motion.div>

          {/* Social Logins */}
          <motion.div
            className="grid grid-cols-2 gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <motion.button
              className="flex items-center justify-center gap-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl py-3 text-sm font-bold text-zinc-700 shadow-sm"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
              Google
            </motion.button>
            <motion.button
              className="flex items-center justify-center gap-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl py-3 text-sm font-bold text-zinc-700 shadow-sm"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2C6.477,2,2,6.477,2,12c0,4.418,2.865,8.166,6.839,9.489c0.5,0.092,0.682-0.217,0.682-0.482c0-0.237-0.009-0.866-0.013-1.7 c-2.782,0.604-3.369-1.341-3.369-1.341c-0.454-1.155-1.11-1.462-1.11-1.462c-0.908-0.62,0.069-0.608,0.069-0.608 c1.003,0.07,1.531,1.03,1.531,1.03c0.892,1.529,2.341,1.087,2.91,0.831c0.092-0.646,0.35-1.087,0.636-1.337 c-2.22-0.253-4.555-1.11-4.555-4.943c0-1.091,0.39-1.984,1.029-2.683c-0.103-0.253-0.446-1.27,0.098-2.647 c0,0,0.84-0.269,2.75,1.026C10.795,7.904,11.398,7.789,12,7.784c0.601,0.005,1.205,0.12,2.004,0.342 c1.91-1.295,2.75-1.026,2.75-1.026c0.545,1.377,0.202,2.394,0.099,2.647c0.641,0.699,1.028,1.592,1.028,2.683 c0,3.842-2.339,4.687-4.566,4.935c0.359,0.309,0.678,0.919,0.678,1.852c0,1.336-0.012,2.415-0.012,2.743 c0,0.267,0.18,0.578,0.688,0.48C19.138,20.161,22,16.416,22,12C22,6.477,17.523,2,12,2z"/>
              </svg>
              GitHub
            </motion.button>
          </motion.div>

          {/* Footer Link */}
          <motion.p
            className="text-center mt-8 text-sm text-zinc-500 font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Don't have an account?{' '}
            <MotionLink
              to="/signup"
              className="text-[#22c55e] font-bold hover:text-green-600 hover:underline transition-all"
              whileHover={{ x: 3 }}
            >
              Sign up
            </MotionLink>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
