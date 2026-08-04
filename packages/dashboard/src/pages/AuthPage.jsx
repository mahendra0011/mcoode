import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, logout } from '../api/client.js';
import { Button } from '../components/ui/button.jsx';
import { Input, Label } from '../components/ui/input.jsx';
import { TerminalSquare } from 'lucide-react';

export function AuthPage({ mode }) {
  const navigate = useNavigate();
  const isLogin = mode === 'login';
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = isLogin
        ? await api.post('/auth/login', { email: form.email, password: form.password })
        : await api.post('/auth/signup', form);
      localStorage.setItem('mcode_access', res.data.access);
      localStorage.setItem('mcode_refresh', res.data.refresh);
      navigate('/app');
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-mcode-bg bg-grid-dots bg-size-dots px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 font-mono">
          <TerminalSquare className="h-5 w-5 text-mcode-green" />
          <span className="text-lg font-bold text-white">mcode</span>
        </Link>
        <form onSubmit={submit} className="terminal-card space-y-4 p-6">
          <h1 className="font-mono text-lg font-semibold text-white">
            {isLogin ? 'Sign in' : 'Create account'}
          </h1>
          {!isLogin && (
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
          {error && <p className="font-mono text-xs text-mcode-red">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '…' : isLogin ? 'Sign in' : 'Sign up'}
          </Button>
          <p className="text-center text-xs text-gray-500">
            {isLogin ? (
              <>No account? <Link to="/signup" className="text-mcode-green">Sign up</Link></>
            ) : (
              <>Already registered? <Link to="/login" className="text-mcode-green">Sign in</Link></>
            )}
          </p>
          {isLogin && (
            <button
              type="button"
              className="w-full text-center font-mono text-xs text-gray-600 hover:text-mcode-green"
              onClick={() => {
                localStorage.removeItem('mcode_access');
                logout();
              }}
            >
              use demo mode →
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
