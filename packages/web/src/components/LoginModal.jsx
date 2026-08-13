import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, X } from 'lucide-react';
import api from '../lib/axios';

export function LoginModal({ isOpen, onClose, onSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const endpoint = isLogin ? '/api/v1/auth/login' : '/api/v1/auth/signup';
    const payload = isLogin 
      ? { email: form.email, password: form.password }
      : { email: form.email, password: form.password, name: form.name || 'User' };

    try {
      const res = await api.post(endpoint, payload);
      const data = res.data;

      if (res.status >= 400) {
        throw new Error(data.error?.message || 'Authentication failed');
      }
      
      localStorage.setItem('mcode_tokens', JSON.stringify({ access: data.access, refresh: data.refresh }));
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="bg-white rounded-[2rem] p-8 shadow-2xl relative w-full max-w-[400px] z-10 overflow-hidden"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
        >
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center mb-6 mt-2">
            <h2 className="text-[24px] font-bold text-zinc-900 leading-tight mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-zinc-500 text-sm font-medium leading-relaxed px-2">
              {isLogin ? 'Log in to continue using M Code AI.' : 'Sign up to start building with M Code AI.'}
            </p>
          </div>

          {error && (
            <motion.div
              className="p-3 bg-red-100 border border-red-300 text-red-800 text-sm rounded-xl mb-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {error}
            </motion.div>
          )}

          <form className="space-y-4" onSubmit={submit}>
            {!isLogin && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-[#eff4fb] border border-transparent rounded-xl py-3 px-4 text-zinc-900 placeholder:text-zinc-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                  placeholder="Full Name"
                  required={!isLogin}
                />
              </motion.div>
            )}

            <div>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-[#eff4fb] border border-transparent rounded-xl py-3 px-4 text-zinc-900 placeholder:text-zinc-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                placeholder="Email Address"
                required
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-[#eff4fb] border border-transparent rounded-xl py-3 pl-4 pr-11 text-zinc-900 placeholder:text-zinc-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                placeholder="Password"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-green-500/20 mt-2 disabled:opacity-50 transition-colors"
            >
              {loading ? (isLogin ? 'Logging in...' : 'Creating...') : (isLogin ? 'Login' : 'Create Account')}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-zinc-500 font-medium">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-[#22c55e] font-bold hover:text-green-600 hover:underline transition-all"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
