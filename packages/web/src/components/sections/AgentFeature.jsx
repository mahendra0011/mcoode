import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowUpRight, ArrowDown } from 'lucide-react';
import robotVideo from '../../assets/robot-video.mp4';

gsap.registerPlugin(ScrollTrigger);

export function AgentFeature() {
  const sectionRef = useRef(null);
  const badgeRef = useRef(null);
  const robotRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Rotate the scroll down badge infinitely
      gsap.to(badgeRef.current, {
        rotation: 360,
        duration: 8,
        repeat: -1,
        ease: "linear"
      });

      // Animate texts in
      gsap.from('.agent-text', {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
        },
        y: 50,
        opacity: 0,
        duration: 1,
        stagger: 0.15,
        ease: 'power3.out'
      });

      // Parallax and scale the robot image
      gsap.from(robotRef.current, {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1
        },
        scale: 1.1,
        y: 100,
        transformOrigin: 'bottom center'
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative w-full min-h-screen flex flex-col justify-between overflow-hidden bg-[#e8f1f5] rounded-3xl my-8 mx-auto max-w-[98%] border border-black/5" style={{ colorScheme: 'light' }}>
      
      {/* Robot Video Background */}
      <div className="absolute inset-0 z-0">
        <video 
          ref={robotRef}
          src={robotVideo} 
          className="w-full h-full object-cover object-bottom opacity-95" 
          autoPlay
          loop
          muted
          playsInline
        />
      </div>
      
      {/* Overlay Content */}
      <div className="relative z-10 w-full px-6 md:px-10 lg:px-12 pt-20 md:pt-32 pb-12 flex flex-col min-h-screen">
        
        {/* Top Huge Heading */}
        <div className="agent-text relative z-10 max-w-[90%] md:max-w-xl lg:max-w-3xl">
          <h2 className="text-4xl md:text-5xl lg:text-[3.8rem] tracking-tight font-serif text-black leading-[1.15]">
            Your intelligent AI-agent<br/>
            that understands your entire<br/>
            codebase <span className="text-[#F95A2C]">&lt;/&gt;</span>
          </h2>
        </div>
        
        {/* Bottom Elements (Left & Right columns) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mt-auto pt-64 gap-8 pb-12 md:pb-0">
          
          {/* Left Content */}
          <div className="agent-text max-w-sm">
            <p className="font-medium text-lg mb-6 text-black">
              Start with mcode Today<br/>
              and Make Coding Effortless!
            </p>
            <button className="group flex items-center gap-2 bg-black hover:bg-neutral-800 transition-colors text-white px-6 py-3 rounded-full font-medium text-sm">
              Get started 
              <span className="bg-white text-black p-1 rounded-full group-hover:rotate-45 transition-transform duration-300">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </button>
          </div>
          
          {/* Right Content */}
          <div className="agent-text max-w-sm md:text-right pr-4 md:pr-24">
            <p className="text-black text-lg">
              <strong className="font-medium text-xl">Build / Debug / Review</strong><br/>
              any code and turn your ideas directly into real products.
            </p>
          </div>
          
        </div>
        
      </div>

      {/* Rotating Badge */}
      <div className="absolute bottom-8 right-8 md:bottom-16 md:right-16 z-20 hidden md:flex items-center justify-center w-32 h-32">
        <div ref={badgeRef} className="absolute inset-0 origin-center">
          <svg viewBox="0 0 100 100" className="w-full h-full text-black overflow-visible">
            <path id="circlePath" d="M 50, 50 m -35, 0 a 35,35 0 1,1 70,0 a 35,35 0 1,1 -70,0" fill="transparent" />
            <text className="text-[14px] font-medium uppercase tracking-[0.2em]">
              <textPath href="#circlePath" startOffset="0%">
                Scroll Down • Scroll Down •
              </textPath>
            </text>
          </svg>
        </div>
        <ArrowDown className="w-6 h-6 text-black relative z-10" />
      </div>

    </section>
  );
}
