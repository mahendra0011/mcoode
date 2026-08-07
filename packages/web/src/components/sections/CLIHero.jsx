import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ArrowDownRight, Copy, Check } from 'lucide-react';

export function CLIHero() {
  const heroRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-element', {
        y: 40,
        opacity: 0,
        filter: 'blur(10px)',
        duration: 1,
        stagger: 0.15,
        ease: 'power3.out',
        delay: 0.2
      });
    }, heroRef);
    return () => ctx.revert();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText('npm i -g mcode-cli');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section ref={heroRef} className="flex flex-col relative" style={{ colorScheme: 'light' }}>
      <div className="flex items-start justify-center px-6 pt-64 max-[850px]:pt-32 relative z-10">
        <div className="flex flex-col items-center max-[850px]:items-start text-center max-[850px]:text-left max-w-4xl max-[850px]:w-full">
          <div className="hero-element inline-flex items-center gap-1.5 pl-4 pr-3 py-1.5 rounded-xl border border-black/10 bg-white text-black text-sm font-medium mb-6">
            MCode CLI <span className="text-accent">✦</span>
          </div>
          
          <h1 className="text-8xl max-[850px]:text-5xl font-medium tracking-tight leading-[1.1] mb-6 text-black">
            <span className="block hero-element text-white">Ship code without</span>
            <span className="block hero-element text-white">
              leaving your <span className="italic font-serif text-green-500 bg-white px-3 py-1 rounded-xl">terminal</span>
            </span>
          </h1>
          
          <p className="hero-element text-lg text-white font-medium mb-8">
            mcode is a terminal-first, multi-model AI coding CLI. Bring your own model keys, split work into parallel subagents, and let a background daemon keep your project fixed while you sleep.
          </p>
          
          <div className="hero-element flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
            <button type="button" className="group relative cursor-pointer inline-flex items-center max-[850px]:w-full">
              <span className="absolute right-0 inset-y-0 w-[calc(100%-2rem)] max-[850px]:w-full rounded-xl bg-accent"></span>
              <span className="relative z-10 px-6 py-3 rounded-xl bg-black text-white font-medium max-[850px]:flex-1">
                Browse commands
              </span>
              <span className="relative -left-px z-10 w-11 h-11 rounded-xl flex items-center justify-center text-black">
                <ArrowDownRight className="w-5 h-5 transition-transform duration-300 group-hover:-rotate-45" />
              </span>
            </button>

            <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md border border-black/10 rounded-xl p-2 pl-6 shadow-sm w-full sm:w-auto h-[46px]">
              <code className="text-sm font-mono text-black font-semibold">npm i -g mcode-cli</code>
              <button 
                onClick={handleCopy}
                className="p-1.5 hover:bg-black/5 rounded-lg transition-colors text-neutral-600 hover:text-black"
                title="Copy command"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
