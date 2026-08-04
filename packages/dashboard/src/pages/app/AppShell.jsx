import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { isAuthed, logout } from '../../api/client.js';
import { connectSocket } from '../../socket/socket.js';
import { ToastStack } from '../../components/ToastStack.jsx';
import { TerminalSquare, LogOut } from 'lucide-react';

const NAV = [
  ['/app', 'Sessions', true],
  ['/app/agents', 'Agents', false],
  ['/app/watch', 'Watch', false],
  ['/app/usage', 'Usage', false],
  ['/app/settings', 'Settings', false]
];

export function AppShell() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthed()) {
      navigate('/login');
      return;
    }
    connectSocket();
  }, [navigate]);

  return (
    <div className="flex min-h-screen bg-mcode-bg">
      <aside className="flex w-52 shrink-0 flex-col border-r border-mcode-border bg-mcode-panel/40">
        <div className="flex items-center gap-2 border-b border-mcode-border px-4 py-4 font-mono">
          <TerminalSquare className="h-5 w-5 text-mcode-green" />
          <span className="font-bold text-white">mcode</span>
          <span className="text-[10px] text-gray-600">v2.4.6</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/app'}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 font-mono text-sm ${
                  isActive ? 'bg-mcode-green/10 text-mcode-green' : 'text-gray-500 hover:bg-mcode-panel hover:text-gray-300'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-mcode-border p-3">
          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 font-mono text-sm text-gray-500 hover:text-mcode-red"
          >
            <LogOut className="h-4 w-4" /> logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
      <ToastStack />
    </div>
  );
}
