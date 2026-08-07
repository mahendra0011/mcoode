import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function DashboardPreview() {
  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(containerRef.current, {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
        },
        y: 40,
        opacity: 0,
        duration: 1,
        ease: 'power3.out'
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="relative px-6 mt-24 max-[850px]:mt-10 mb-32 z-10">
      <div className="relative max-w-5xl mx-auto">
        <div className="relative bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-200 shadow-2xl/5 mask-linear-gradient flex items-center justify-center min-h-[400px]">
          {/* Placeholder for Dashboard Mockup */}
          <div className="text-white text-xl font-medium opacity-50">Dashboard Preview Image</div>
        </div>
      </div>
    </div>
  );
}
