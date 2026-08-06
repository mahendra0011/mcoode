import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Header() {
  return (
    <header className="fixed shadow-2xl/20 rounded-b-4xl top-2.5 left-1/2 -translate-x-1/2 w-full max-w-5xl bg-frame z-50 max-[850px]:top-0 max-[850px]:w-full max-[850px]:max-w-none max-[850px]:rounded-none max-[850px]:rounded-b-4xl max-[850px]:overflow-hidden">
      <div className="h-20 max-[850px]:h-18 flex items-center justify-between px-4 max-[850px]:px-6">
        <Link to="/" className="flex items-center gap-2 ml-4 max-[850px]:ml-0">
          <div className="w-6 h-6 rounded-full bg-foreground"></div>
          <span className="text-lg font-semibold text-foreground leading-none max-[1200px]:hidden max-[850px]:inline">
            mcode
          </span>
        </Link>
        
        <nav className="flex items-center gap-1 max-[1200px]:gap-0 max-[850px]:hidden">
          <button className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors rounded-full hover:bg-foreground/5">
            Products <ChevronDown className="w-4 h-4" />
          </button>
          <Link to="/ai" className="px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors rounded-full hover:bg-foreground/5">
            AI
          </Link>
          <button className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors rounded-full hover:bg-foreground/5">
            Resources <ChevronDown className="w-4 h-4" />
          </button>
          <a href="#pricing" className="px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors rounded-full hover:bg-foreground/5">
            Pricing
          </a>
        </nav>
        
        <div className="flex items-center gap-4 max-[850px]:hidden">
          <a href="#" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
            Sign in
          </a>
          <a href="#" className="group relative inline-flex items-center">
            <span className="absolute right-0 inset-y-0 w-[calc(100%-1.5rem)] rounded-xl bg-accent"></span>
            <span className="relative z-10 px-5 py-3 rounded-xl bg-foreground text-background text-sm font-medium">
              Try for free
            </span>
            <span className="relative -left-px z-10 w-10 h-10 rounded-xl flex items-center justify-center text-black">
              <ArrowDownRight className="w-4 h-4 transition-transform duration-300 group-hover:-rotate-45" />
            </span>
          </a>
        </div>
        
        <button className="hidden max-[850px]:flex items-center justify-center w-10 h-10" aria-label="Open menu">
          <div className="w-8 h-4 relative flex flex-col justify-between cursor-pointer">
            <span className="block h-0.5 w-full bg-foreground origin-center rounded-full"></span>
            <span className="block h-0.5 w-full bg-foreground origin-center rounded-full"></span>
          </div>
        </button>
      </div>
    </header>
  );
}
