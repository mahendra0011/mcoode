import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils.js';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-mono text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mcode-green/50 disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-mcode-green text-black font-semibold hover:bg-mcode-greenBright',
        outline: 'border border-mcode-border bg-transparent text-gray-200 hover:bg-mcode-panel hover:border-mcode-green/50',
        ghost: 'text-gray-400 hover:text-mcode-green hover:bg-mcode-panel',
        danger: 'bg-mcode-red/10 text-mcode-red border border-mcode-red/30 hover:bg-mcode-red/20',
        link: 'text-mcode-green underline-offset-4 hover:underline p-0 h-auto'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10'
      }
    },
    defaultVariants: { variant: 'default', size: 'default' }
  }
);

export const Button = React.forwardRef(function Button(
  { className, variant, size, asChild = false, ...props },
  ref
) {
  const Comp = asChild ? 'span' : 'button';
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
