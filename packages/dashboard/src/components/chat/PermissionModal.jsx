import { useState, useEffect } from 'react';
import { Shield, ShieldAlert } from 'lucide-react';

/**
 * Prompts the user for permission before the agent runs a tool.
 * The requestId ties the answer back to the ChatAgent's _askPermission.
 */
export function PermissionModal({ pendingPermission, onAnswer }) {
  if (!pendingPermission) return null;

  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          onAnswer('no');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onAnswer]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur">
      <div className="w-full max-w-md rounded-lg border border-mcode-amber/30 bg-mcode-panel p-5">
        <div className="mb-4 flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-mcode-amber" />
          <h3 className="font-mono text-lg text-mcode-amber">Permission required</h3>
        </div>
        <p className="mb-3 font-mono text-sm text-gray-300 break-all">
          {pendingPermission.command || pendingPermission.block}
        </p>
        <div className="mb-4 font-mono text-xs text-gray-600">
          This action will be executed in your project workspace.
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onAnswer('yes')}
            className="flex-1 rounded-md bg-mcode-green px-3 py-2 font-mono text-xs text-black font-semibold hover:bg-mcode-greenBright"
          >
            Allow
          </button>
          <button
            onClick={() => onAnswer('always')}
            className="flex-1 rounded-md border border-mcode-border bg-mcode-panel px-3 py-2 font-mono text-xs text-gray-400 hover:border-mcode-green/50 hover:text-mcode-green"
          >
            Always
          </button>
          <button
            onClick={() => onAnswer('no')}
            className="flex-1 rounded-md border border-mcode-red/30 bg-mcode-red/10 px-3 py-2 font-mono text-xs text-mcode-red hover:bg-mcode-red/20"
          >
            Deny
          </button>
        </div>
        <div className="mt-3 text-right font-mono text-xs text-gray-600">
          Auto-deny in {timeLeft}s
        </div>
      </div>
    </div>
  );
}
