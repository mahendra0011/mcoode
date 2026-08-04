import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { dismissToast } from '../store/slices/toastSlice.js';

const KIND_STYLES = {
  ok: 'border-mcode-green/40 text-mcode-green',
  warn: 'border-amber-500/40 text-amber-400',
  err: 'border-red-500/40 text-red-400',
  info: 'border-mcode-border text-gray-300'
};

export function ToastStack() {
  const dispatch = useDispatch();
  const toasts = useSelector((s) => s.toasts.items);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) => setTimeout(() => dispatch(dismissToast(t.id)), 5000));
    return () => timers.forEach(clearTimeout);
  }, [toasts, dispatch]);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-toast-in rounded-lg border bg-mcode-panel/95 px-4 py-3 font-mono text-xs shadow-lg backdrop-blur ${KIND_STYLES[t.kind] || KIND_STYLES.info}`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
