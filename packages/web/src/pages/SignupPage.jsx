import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Clock } from 'lucide-react';
import robotBg from '../assets/robot-bg-new.png';
import api from '../lib/axios';

const MotionLink = motion.create(Link);

const formVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.3 } }
};

const fieldVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }
};

const otpBoxVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } }
};

export function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendTimeout, setResendTimeout] = useState(0);
  const [devOtp, setDevOtp] = useState('');

  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];

  // resend countdown
  useEffect(() => {
    if (resendTimeout <= 0) return;
    const t = setTimeout(() => setResendTimeout(resendTimeout - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimeout]);

  const focusBox = (idx) => {
    inputRefs[idx]?.current?.focus();
  };

  const handleOtpChange = (idx, value) => {
    const newOtp = otp.split('');
    newOtp[idx] = value.slice(-1) || '';
    setOtp(newOtp.join(''));
    if (value && idx < 5) focusBox(idx + 1);
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) focusBox(idx - 1);
    if (e.key === 'ArrowLeft' && idx > 0) focusBox(idx - 1);
    if (e.key === 'ArrowRight' && idx < 5) focusBox(idx + 1);
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d{6}$/.test(pasted)) {
      setOtp(pasted);
      inputRefs[5]?.current?.blur();
    }
  };

  const sendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/v1/auth/send-otp', { email: form.email, intent: 'signup' });
      if (res.status >= 400) {
        throw new Error(res.data?.error?.message || 'Failed to send code');
      }
      if (res.data.devOtp) setDevOtp(res.data.devOtp);
      setOtpStep(true);
      setResendTimeout(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);
    setOtpError('');
    try {
      const res = await api.post('/api/v1/auth/verify-otp', {
        email: form.email,
        otp,
        intent: 'signup',
        name: form.name,
        password: form.password
      });
      if (res.status >= 400) {
        throw new Error(res.data?.error?.message || 'Invalid verification code');
      }
      localStorage.setItem('mcode_tokens', JSON.stringify({ access: res.data.access, refresh: res.data.refresh }));
      navigate('/ai/chat');
    } catch (err) {
      setOtpError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setResendTimeout(60);
    setOtp('');
    setOtpError('');
    try {
      const res = await api.post('/api/v1/auth/send-otp', { email: form.email, intent: 'signup' });
      if (res.status >= 400) {
        throw new Error(res.data?.error?.message || 'Failed to resend code');
      }
      if (res.data.devOtp) setDevOtp(res.data.devOtp);
    } catch (err) {
      setOtpError(err.message);
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
          className="text-zinc-900 font-bold text-sm"
          whileHover={{ opacity: 0.7 }}
          transition={{ duration: 0.2 }}
        >
          Login
        </MotionLink>
        <MotionLink
          to="/signup"
          className="bg-[#4ade80] text-white font-bold text-sm px-6 py-2.5 rounded-full shadow-md shadow-green-500/20"
          whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(74, 222, 128, 0.5)' }}
          whileTap={{ scale: 0.97 }}
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
            <AnimatePresence mode="wait">
              {!otpStep ? (
                <motion.h1
                  key="signup-title"
                  className="text-[28px] font-bold text-zinc-900 leading-tight mb-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: 0.15 }}
                >
                  Create Your{' '}
                  <motion.span
                    className="text-[#22c55e]"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                  >
                    Account
                  </motion.span>
                </motion.h1>
              ) : (
                <motion.h1
                  key="otp-title"
                  className="text-[28px] font-bold text-zinc-900 leading-tight mb-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: 0.15 }}
                >
                  Verify Your{' '}
                  <motion.span
                    className="text-[#22c55e]"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                  >
                    Email
                  </motion.span>
                </motion.h1>
              )}
            </AnimatePresence>
            {!otpStep ? (
              <motion.p
                key="signup-desc"
                className="text-zinc-500 text-sm font-medium leading-relaxed px-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.2 }}
              >
                Join thousands of developers building the future with AI.
              </motion.p>
            ) : (
              <motion.p
                key="otp-desc"
                className="text-zinc-500 text-sm font-medium leading-relaxed px-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.2 }}
              >
                We sent a 6-digit code to <span className="text-zinc-900 font-semibold">{form.email}</span>.
              </motion.p>
            )}
          </div>

          {/* Error Display */}
          {(error || otpError) && (
            <motion.div
              className="p-3 bg-red-100 border border-red-300 text-red-800 text-sm rounded-xl mb-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              {error || otpError}
            </motion.div>
          )}

          {/* Step 1: Account Details Form */}
          {!otpStep && (
            <motion.form
              className="space-y-4"
              onSubmit={sendOtp}
              variants={formVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Name Field */}
              <motion.div variants={fieldVariants}>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-[#eff4fb] border border-transparent rounded-xl py-3.5 px-4 text-zinc-900 placeholder:text-zinc-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                  placeholder="Full Name"
                  required
                />
              </motion.div>

              {/* Email Field */}
              <motion.div variants={fieldVariants}>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-[#eff4fb] border border-transparent rounded-xl py-3.5 px-4 text-zinc-900 placeholder:text-zinc-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                  placeholder="Email Address"
                  required
                />
              </motion.div>

              {/* Password Field */}
              <motion.div className="relative" variants={fieldVariants}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-[#eff4fb] border border-transparent rounded-xl py-3.5 pl-4 pr-11 text-zinc-900 placeholder:text-zinc-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                  placeholder="Password"
                  required
                  minLength={8}
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

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={loading}
                className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-green-500/20 mt-4 disabled:opacity-50 flex items-center justify-center gap-2"
                variants={fieldVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading && <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}><Mail className="w-4 h-4" /></motion.div>}
                {loading ? 'Sending code...' : 'Send Verification Code'}
              </motion.button>
            </motion.form>
          )}

          {/* Step 2: OTP Verification */}
          {otpStep && (
            <motion.form
              className="space-y-4"
              onSubmit={verifyOtp}
              variants={formVariants}
              initial="hidden"
              animate="visible"
            >
              {/* OTP Input Boxes */}
              <motion.div
                className="flex items-center justify-center gap-2 py-4"
                variants={otpBoxVariants}
              >
                {Array.from({ length: 6 }).map((_, idx) => (
                  <motion.input
                    key={idx}
                    ref={inputRefs[idx]}
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={1}
                    value={otp[idx] || ''}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={idx === 0 ? handleOtpPaste : undefined}
                    className="w-12 h-12 text-center text-xl font-bold text-zinc-900 bg-[#eff4fb] border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 + idx * 0.05, type: 'spring', stiffness: 300 }}
                  />
                ))}
              </motion.div>

              {/* Dev OTP hint (only in non-production) */}
              {devOtp && (
                <motion.div
                  className="text-center text-xs text-zinc-400 font-mono bg-zinc-50 py-2 rounded-lg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Dev code: {devOtp}
                </motion.div>
              )}

              {/* Resend Timer */}
              <motion.div
                className="flex items-center justify-center gap-2 text-sm text-zinc-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Clock className="w-4 h-4" />
                {resendTimeout > 0 ? (
                  <span>Resend in {resendTimeout}s</span>
                ) : (
                  <motion.button
                    type="button"
                    onClick={resendOtp}
                    className="text-[#22c55e] font-semibold hover:underline"
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Resend code
                  </motion.button>
                )}
              </motion.div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-green-500/20 mt-4 disabled:opacity-50 flex items-center justify-center gap-2"
                variants={fieldVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading && <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}><Mail className="w-4 h-4" /></motion.div>}
                {loading ? 'Verifying...' : 'Verify & Create Account'}
              </motion.button>

              {/* Back to account details */}
              <motion.button
                type="button"
                onClick={() => { setOtpStep(false); setOtp(''); setOtpError(''); setError(''); }}
                className="w-full text-zinc-500 text-sm font-medium hover:text-zinc-800 transition-colors"
                variants={fieldVariants}
                whileHover={{ x: 3 }}
              >
                ← Back to account details
              </motion.button>
            </motion.form>
          )}

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
            Already have an account?{' '}
            <MotionLink
              to="/login"
              className="text-[#22c55e] font-bold hover:text-green-600 hover:underline transition-all"
              whileHover={{ x: 3 }}
            >
              Login
            </MotionLink>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
