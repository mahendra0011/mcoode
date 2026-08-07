import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import robotBg from '../assets/ai-bg.png';

// Import all home page sections so we can make it a full landing page
import { AgentFeature } from '../components/sections/AgentFeature';
import { LogoTicker } from '../components/sections/LogoTicker';
import { FeaturesGrid } from '../components/sections/FeaturesGrid';
import { Testimonials } from '../components/sections/Testimonials';
import { HowItWorks } from '../components/sections/HowItWorks';
import { Pricing } from '../components/sections/Pricing';

export function AILandingPage() {
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
    <Layout>
      {/* AI Hero Section - Restored to exact previous layout but with GSAP */}
      <div className="relative w-full min-h-screen bg-white font-sans selection:bg-accent/20 overflow-hidden" ref={heroRef}>
        
        {/* Background Image - Restored to full screen (no inset) */}
        <div 
          className="absolute inset-0 bg-no-repeat z-0"
          style={{ 
            backgroundImage: `url(${robotBg})`,
            backgroundPosition: 'center 40px',
            backgroundSize: '100% auto',
            backgroundColor: '#ffffff'
          }}
          aria-hidden="true"
        />
        
        <div className="relative z-10 min-h-screen flex items-center pt-20">
          {/* Content restricted to the left side again */}
          <div className="w-full max-w-7xl mx-auto px-6 flex flex-col justify-center h-full">
            <div className="max-w-xl pb-20">
              
              <div className="hero-element inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E5F5E9] text-black text-xs font-semibold mb-6">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> MCode AI Agent
              </div>
              
              <h1 className="hero-element text-6xl md:text-[80px] font-bold tracking-tight text-black mb-6 leading-[1.05]">
                Code at the speed of <span className="italic font-serif text-emerald-600">Thought</span>
              </h1>
              
              <p className="hero-element text-[17px] text-neutral-800 font-medium mb-10 leading-[1.6] pr-8">
                Meet your new pair programmer. Describe what you want to build, and watch MCode AI generate production-ready code, fix bugs, and refactor architecture instantly.
              </p>
              
              <div className="hero-element flex items-center gap-6 mt-12">
                <Link 
                  to="/ai/chat" 
                  className="group flex items-center gap-2 text-white/90 hover:text-white font-medium text-[15px] transition-colors"
                >
                  <span className="px-6 py-3 rounded-full bg-black text-white flex items-center gap-2 shadow-[0_0_20px_rgba(0,0,0,0.2)] hover:scale-105 transition-transform">
                    Chat with AI <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
                
                <button 
                  type="button" 
                  className="px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-black/10 text-black font-semibold shadow-sm hover:bg-black/5 transition-colors text-[15px] flex items-center gap-2"
                >
                  Explore Features
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Rest of the Home Page sections to make it "home page jesa" */}
      <AgentFeature />
      <LogoTicker />
      <FeaturesGrid />
      <Testimonials />
      <HowItWorks />
      <Pricing />
    </Layout>
  );
}
