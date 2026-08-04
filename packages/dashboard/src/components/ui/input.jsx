import { cn } from '../../lib/utils.js';

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'flex h-10 w-full rounded-md border border-mcode-border bg-mcode-bg px-3 py-2 font-mono text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-mcode-green/40',
        className
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }) {
  return (
    <label className={cn('font-mono text-xs text-gray-400 mb-1 block', className)} {...props} />
  );
}
