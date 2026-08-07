import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Header } from '../components/layout/Header';
import robotBg from '../assets/ai-bg.png';

export function AILandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans selection:bg-accent/20 overflow-hidden relative">
      <Header />
      
      {/* Background Image - Exactly like screenshot */}
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
      
      <main className="relative z-10 min-h-screen flex items-center pt-20">
        
        {/* Content restricted to the left side */}
        <div className="w-full max-w-7xl mx-auto px-6 flex flex-col justify-center h-full">
          <div className="max-w-xl pb-20">
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E5F5E9] text-black text-xs font-semibold mb-6">
              <Sparkles className="w-3.5 h-3.5 text-black" /> MCode AI Agent
            </div>
            
            {/* Heading */}
            <h1 className="text-6xl md:text-[80px] font-bold tracking-tight text-black mb-6 leading-[1.05]">
              Code at the speed of
            </h1>
            
            {/* Paragraph */}
            <p className="text-[17px] text-neutral-800 font-medium mb-10 leading-[1.6] pr-8">
              Meet your new pair programmer. Describe what you want to build, and watch MCode AI generate production-ready code, fix bugs, and refactor architecture instantly.
            </p>
            
            {/* Buttons */}
            <div className="flex items-center gap-6 mt-12">
              <Link 
                to="/ai/chat" 
                className="group flex items-center gap-2 text-white/90 hover:text-white font-medium text-[15px] transition-colors"
              >
                Chat with AI -&gt;
              </Link>
              
              <button 
                type="button" 
                className="px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-black font-semibold shadow-sm hover:bg-white/20 transition-colors text-[15px] flex items-center gap-2"
              >
                Explore Features
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
