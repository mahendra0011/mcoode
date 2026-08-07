import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import robotBg from '../assets/robot-bg-new.png';

export function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/');
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
        <Link to="/login" className="bg-[#4ade80] text-white font-bold text-sm px-6 py-2.5 rounded-full shadow-md shadow-green-500/20 hover:bg-[#22c55e] transition-colors">
          Login
        </Link>
        <Link to="/signup" className="text-zinc-900 font-bold text-sm hover:opacity-70 transition-opacity">
          Create Account
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-[420px] pt-10 pb-10">
        
        {/* White Glassmorphism Form Card */}
        <div className="bg-white rounded-[2rem] p-10 shadow-2xl relative overflow-hidden">
          
          <div className="text-center mb-8">
            <h1 className="text-[28px] font-bold text-zinc-900 leading-tight mb-3">
              Welcome <span className="text-[#22c55e]">Back</span>
            </h1>
            <p className="text-zinc-500 text-sm font-medium leading-relaxed px-2">
              Log in to your account to continue building.
            </p>
          </div>

          <form className="space-y-4" onSubmit={submit}>
            
            {/* Email Field */}
            <div>
              <input 
                type="email" 
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-[#eff4fb] border border-transparent rounded-xl py-3.5 px-4 text-zinc-900 placeholder:text-zinc-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                placeholder="Email Address"
              />
            </div>

            {/* Password Field */}
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-[#eff4fb] border border-transparent rounded-xl py-3.5 pl-4 pr-11 text-zinc-900 placeholder:text-zinc-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                placeholder="Password"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            <div className="text-right">
              <Link to="/forgot-password" className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors">
                Forgot password?
              </Link>
            </div>
            
            {/* Submit Button */}
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-white py-3.5 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-green-500/20 mt-4 disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-8 mb-6 flex items-center before:flex-1 before:border-t before:border-zinc-200 after:flex-1 after:border-t after:border-zinc-200">
            <span className="px-4 text-[11px] text-zinc-400 font-bold uppercase tracking-wider">or continue with</span>
          </div>

          {/* Social Logins */}
          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl py-3 transition-colors text-sm font-bold text-zinc-700 shadow-sm">
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
              Google
            </button>
            <button className="flex items-center justify-center gap-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl py-3 transition-colors text-sm font-bold text-zinc-700 shadow-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2C6.477,2,2,6.477,2,12c0,4.418,2.865,8.166,6.839,9.489c0.5,0.092,0.682-0.217,0.682-0.482c0-0.237-0.009-0.866-0.013-1.7 c-2.782,0.604-3.369-1.341-3.369-1.341c-0.454-1.155-1.11-1.462-1.11-1.462c-0.908-0.62,0.069-0.608,0.069-0.608 c1.003,0.07,1.531,1.03,1.531,1.03c0.892,1.529,2.341,1.087,2.91,0.831c0.092-0.646,0.35-1.087,0.636-1.337 c-2.22-0.253-4.555-1.11-4.555-4.943c0-1.091,0.39-1.984,1.029-2.683c-0.103-0.253-0.446-1.27,0.098-2.647 c0,0,0.84-0.269,2.75,1.026C10.795,7.904,11.398,7.789,12,7.784c0.601,0.005,1.205,0.12,2.004,0.342 c1.91-1.295,2.75-1.026,2.75-1.026c0.545,1.377,0.202,2.394,0.099,2.647c0.641,0.699,1.028,1.592,1.028,2.683 c0,3.842-2.339,4.687-4.566,4.935c0.359,0.309,0.678,0.919,0.678,1.852c0,1.336-0.012,2.415-0.012,2.743 c0,0.267,0.18,0.578,0.688,0.48C19.138,20.161,22,16.416,22,12C22,6.477,17.523,2,12,2z"/>
              </svg>
              GitHub
            </button>
          </div>

          {/* Footer Link */}
          <p className="text-center mt-8 text-sm text-zinc-500 font-medium">
            Don't have an account?{' '}
            <Link to="/signup" className="text-[#22c55e] font-bold hover:text-green-600 hover:underline transition-all">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
