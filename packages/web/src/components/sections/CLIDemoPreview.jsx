import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const demoLines = [
  { text: "$ mcode create next-app", delay: 500, color: "text-green-500" },
  { text: "?  Creating a new mcode app in ./next-app", delay: 1000, color: "text-blue-400" },
  { text: "?  Installing dependencies using npm...", delay: 2500, color: "text-blue-400" },
  { text: "added 342 packages in 2s", delay: 2600, color: "text-gray-400" },
  { text: "?  Initializing git repository", delay: 3000, color: "text-blue-400" },
  { text: "Success! Created next-app at ~/projects/next-app", delay: 3200, color: "text-green-400" },
  { text: "Inside that directory, you can run several commands:", delay: 3300, color: "text-gray-300" },
  { text: "  npm run dev", delay: 3400, color: "text-white" },
  { text: "    Starts the development server.", delay: 3450, color: "text-gray-500" },
  { text: "  npm run build", delay: 3500, color: "text-white" },
  { text: "    Builds the app for production.", delay: 3550, color: "text-gray-500" },
  { text: "We suggest that you begin by typing:", delay: 4000, color: "text-gray-300" },
  { text: "  cd next-app", delay: 4200, color: "text-cyan-400" },
  { text: "  npm run dev", delay: 4400, color: "text-cyan-400" },
];

export function CLIDemoPreview() {
  const containerRef = useRef(null);
  const [visibleLines, setVisibleLines] = useState([]);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(containerRef.current, {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
          onEnter: () => setHasStarted(true)
        },
        y: 40,
        opacity: 0,
        duration: 1,
        ease: 'power3.out'
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!hasStarted) return;
    
    let timeouts = [];
    demoLines.forEach((line, index) => {
      const timeout = setTimeout(() => {
        setVisibleLines(prev => [...prev, line]);
      }, line.delay);
      timeouts.push(timeout);
    });

    return () => timeouts.forEach(clearTimeout);
  }, [hasStarted]);

  return (
    <div ref={containerRef} className="relative px-6 mt-16 max-[850px]:mt-10 mb-32 z-10">
      <div className="relative max-w-4xl mx-auto">
        <div className="relative bg-zinc-950/90 backdrop-blur-2xl rounded-2xl overflow-hidden border border-green-500/20 shadow-[0_30px_100px_rgba(0,255,100,0.15)] flex flex-col min-h-[450px]">
          
          {/* Terminal Header */}
          <div className="flex items-center px-4 py-3 border-b border-green-500/10 bg-zinc-900/80">
            <div className="flex gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-red-500/80 border border-red-500/20"></div>
              <div className="w-3.5 h-3.5 rounded-full bg-yellow-500/80 border border-yellow-500/20"></div>
              <div className="w-3.5 h-3.5 rounded-full bg-green-500/80 border border-green-500/20"></div>
            </div>
            <div className="mx-auto text-xs font-mono text-gray-400">bash - mcode</div>
          </div>

          {/* Terminal Body with Animated Lines */}
          <div className="p-6 font-mono text-[14px] leading-relaxed space-y-2 flex-1">
            {visibleLines.map((line, i) => (
              <div key={i} className={`${line.color} animate-in fade-in slide-in-from-bottom-1 duration-300`}>
                {line.text.startsWith('$') ? (
                  <span className="font-semibold">{line.text}</span>
                ) : line.text.startsWith('  ') ? (
                  <span className="ml-4">{line.text}</span>
                ) : (
                  <span>{line.text}</span>
                )}
              </div>
            ))}
            
            {/* Blinking Cursor */}
            {hasStarted && (
              <div className="mt-2">
                {visibleLines.length === demoLines.length && <span className="text-green-500 mr-2">$</span>}
                <span className="w-2.5 h-5 bg-white/80 inline-block align-middle animate-pulse"></span>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
