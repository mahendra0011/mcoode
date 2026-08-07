import React, { useState } from 'react';
import { Header } from '../components/layout/Header';
import { CLIDemoPreview } from '../components/sections/CLIDemoPreview';
import cliBg from '../assets/cli-bg.jpg';
import { ArrowRight, Copy, Check } from 'lucide-react';
import { cn } from '../lib/utils';

export function CLIPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('npm i -g mcode-cli');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-black font-sans overflow-hidden">
      <Header />
      
      <main className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-4 max-w-7xl mx-auto min-h-screen flex items-center">
        {/* Background Image */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat opacity-40"
          style={{ backgroundImage: `url(${cliBg})` }}
        />
        
        {/* Content */}
        <div className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Left: Text and CTA */}
          <div className="flex flex-col items-start gap-8">
            <div className="space-y-6">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]">
                Ship code without leaving your terminal
              </h1>
              <p className="text-lg sm:text-xl text-zinc-400 max-w-xl leading-relaxed">
                mcode is a terminal-first, multi-model AI coding CLI. Bring your own model keys, split work into parallel subagents, and let a background daemon keep your project fixed while you sleep.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
              <button className="flex items-center justify-center gap-2 bg-[#4ade80] hover:bg-[#22c55e] text-black font-bold px-8 py-4 rounded-xl transition-all w-full sm:w-auto shadow-lg shadow-green-500/20">
                Get started <ArrowRight className="w-5 h-5" />
              </button>
              <button className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-semibold px-8 py-4 rounded-xl transition-all border border-white/10 w-full sm:w-auto">
                Browse commands
              </button>
            </div>

            <div className="mt-4 flex items-center gap-3 bg-black/50 backdrop-blur-md border border-white/10 rounded-xl p-2 pl-6 shadow-xl w-full sm:w-auto">
              <code className="text-sm font-mono text-zinc-300">npm i -g mcode-cli</code>
              <button 
                onClick={handleCopy}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white"
                title="Copy command"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          {/* Right: CLI Demo */}
          <div className="w-full">
            <CLIDemoPreview />
          </div>

        </div>
      </main>
    </div>
  );
}
