import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';

const MotionLink = motion.create(Link);
import { ArrowDownRight } from 'lucide-react';
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
            <motion.h1
              className="text-[28px] font-bold text-zinc-900 leading-tight mb-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              Forgot{' '}
              <motion.span
                className="text-[#22c55e]"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
              >
                Password
              </motion.span>
            </motion.h1>
            <motion.p
              className="text-zinc-500 text-sm font-medium leading-relaxed px-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Enter your email and we'll send you a link to reset your password.
            </motion.p>
          </div>

          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.form
                key="form"
                className="space-y-4"
                onSubmit={submit}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.25 }}
              >
                {/* Email Field */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#eff4fb] border border-transparent rounded-xl py-3.5 px-4 text-zinc-900 placeholder:text-zinc-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                    placeholder="Email Address"
                    required
                  />
                </motion.div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-green-500/20 mt-4 disabled:opacity-50 flex items-center justify-center gap-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading && <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}><ArrowDownRight className="w-4 h-4" /></motion.div>}
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </motion.button>
              </motion.form>
            ) : (
              <motion.div
                key="success"
                className="text-center py-4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <motion.div
                  className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                >
                  <motion.svg
                    className="w-8 h-8 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.3, delay: 0.15 }}
                  >
                    <motion.path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </motion.svg>
                </motion.div>
                <motion.h3
                  className="text-lg font-bold text-zinc-900 mb-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  Check your email
                </motion.h3>
                <motion.p
                  className="text-sm text-zinc-500 mb-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                >
                  We've sent a password reset link to {email}
                </motion.p>
                <motion.button
                  onClick={() => navigate('/login')}
                  className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-900 py-3.5 rounded-xl font-bold text-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Back to Login
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer Link */}
          <motion.p
            className="text-center mt-8 text-sm text-zinc-500 font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Remember your password?{' '}
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
