import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ArrowDownRight } from 'lucide-react';
import heroBg from '../../assets/hero-bg.png';

export function Hero() {
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
      
      
      <div className="flex items-start justify-center px-6 pt-64 max-[850px]:pt-32 relative z-10">
        <div className="flex flex-col items-center max-[850px]:items-start text-center max-[850px]:text-left max-w-4xl max-[850px]:w-full">
          <div className="hero-element inline-flex items-center gap-1.5 pl-4 pr-3 py-1.5 rounded-xl border border-black/10 bg-white text-black text-sm font-medium mb-6">
            Now Available <span className="text-accent">✦</span>
          </div>
          
          <h1 className="text-8xl max-[850px]:text-5xl font-medium tracking-tight leading-[1.1] mb-6 text-black">
            <span className="block hero-element">Build Faster</span>
            <span className="block hero-element">
              Ship with <span className="italic font-serif text-accent">Confidence</span>
            </span>
          </h1>
          
          <p className="hero-element text-lg text-neutral-800 font-medium mb-8">
            The modern platform for teams who want to move fast without breaking things
          </p>
          
          <button type="button" className="hero-element group relative cursor-pointer inline-flex items-center max-[850px]:w-full">
            <span className="absolute right-0 inset-y-0 w-[calc(100%-2rem)] max-[850px]:w-full rounded-xl bg-accent"></span>
            <span className="relative z-10 px-6 py-3 rounded-xl bg-black text-white font-medium max-[850px]:flex-1">
              Get Started
            </span>
            <span className="relative -left-px z-10 w-11 h-11 rounded-xl flex items-center justify-center text-black">
              <ArrowDownRight className="w-5 h-5 transition-transform duration-300 group-hover:-rotate-45" />
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
