import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils.js';
import { DOMAIN_COLORS } from '@mcode/shared';

const badgeVariants = cva(
  'inline-flex items-center rounded-sm font-mono text-[11px] px-1.5 py-0.5 border uppercase tracking-wider',
  {
    variants: {
      variant: {
        default: 'border-mcode-border text-gray-400 bg-mcode-panel',
        success: 'border-mcode-green/40 text-mcode-green bg-mcode-green/10',
        warning: 'border-mcode-amber/40 text-mcode-amber bg-mcode-amber/10',
        danger: 'border-mcode-red/40 text-mcode-red bg-mcode-red/10'
      }
    },
    defaultVariants: { variant: 'default' }
  }
);

export function Badge({ className, variant, style, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} style={style} {...props} />;
}

export function DomainBadge({ domain, ...props }) {
  const color = DOMAIN_COLORS[domain] || '#4ade80';
  return (
    <Badge
      {...props}
      style={{
        borderColor: `${color}55`,
        color,
        background: `${color}14`
      }}
    >
      {domain}
    </Badge>
  );
}
