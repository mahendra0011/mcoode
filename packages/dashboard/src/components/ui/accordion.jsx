import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export function Accordion({ items = [], className }) {
  const [open, setOpen] = useState(0);
  return (
    <div className={cn('divide-y divide-mcode-border rounded-lg border border-mcode-border', className)}>
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="bg-mcode-panel/50">
            <button
              className="flex w-full items-center justify-between px-4 py-3 text-left font-mono text-sm text-gray-200 hover:text-mcode-green"
              onClick={() => setOpen(isOpen ? -1 : i)}
            >
              {item.question}
              <ChevronDown
                className={cn('h-4 w-4 text-gray-500 transition-transform', isOpen && 'rotate-180 text-mcode-green')}
              />
            </button>
            {isOpen && (
              <div className="px-4 pb-4 text-sm text-gray-400">{item.answer}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
