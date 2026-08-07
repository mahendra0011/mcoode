import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ArrowDownRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AIHero() {
  const heroRef = useRef(null);

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

  return (
    <section ref={heroRef} className="flex flex-col relative" style={{ colorScheme: 'light' }}>
      <div className="flex items-start justify-start px-6 pt-64 max-[850px]:pt-32 relative z-10 max-w-7xl mx-auto w-full">
        <div className="flex flex-col items-start text-left max-w-xl max-[850px]:w-full">
          
          <div className="hero-element inline-flex items-center gap-1.5 pl-4 pr-3 py-1.5 rounded-xl border border-black/10 bg-[#E5F5E9] text-black text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4 text-emerald-600" /> MCode AI Agent <span className="text-emerald-600">✦</span>
          </div>
          
          <h1 className="text-8xl max-[850px]:text-5xl font-medium tracking-tight leading-[1.1] mb-6 text-black">
            <span className="block hero-element text-black">Code at the speed of</span>
            <span className="block hero-element italic font-serif text-emerald-600">
              Thought
            </span>
          </h1>
          
          <p className="hero-element text-lg text-neutral-800 font-medium mb-8">
            Meet your new pair programmer. Describe what you want to build, and watch MCode AI generate production-ready code, fix bugs, and refactor architecture instantly.
          </p>
          
          <div className="hero-element flex flex-col sm:flex-row items-center justify-start gap-4 w-full">
            <Link to="/ai/chat" className="group relative cursor-pointer inline-flex items-center max-[850px]:w-full">
              <span className="absolute right-0 inset-y-0 w-[calc(100%-2rem)] max-[850px]:w-full rounded-xl bg-emerald-500"></span>
              <span className="relative z-10 px-6 py-3 rounded-xl bg-black text-white font-medium max-[850px]:flex-1 text-center">
                Chat with AI
              </span>
              <span className="relative -left-px z-10 w-11 h-11 rounded-xl flex items-center justify-center text-black">
                <ArrowDownRight className="w-5 h-5 transition-transform duration-300 group-hover:-rotate-45" />
              </span>
            </Link>

            <button type="button" className="px-6 py-3 rounded-xl bg-white/80 backdrop-blur-md border border-black/10 text-black font-semibold shadow-sm hover:bg-black/5 transition-colors w-full sm:w-auto">
              Explore Features
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}
