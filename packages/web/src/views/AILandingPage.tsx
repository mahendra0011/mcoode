import React from 'react';
import { Layout } from '../components/layout/Layout';
import { AIHero } from '../components/sections/AIHero';
import { AIChatPreview } from '../components/sections/AIChatPreview';
import { AgentFeature } from '../components/sections/AgentFeature';
import { LogoTicker } from '../components/sections/LogoTicker';
import { FeaturesGrid } from '../components/sections/FeaturesGrid';
import { Testimonials } from '../components/sections/Testimonials';
import { HowItWorks } from '../components/sections/HowItWorks';
import { Pricing } from '../components/sections/Pricing';
import robotBg from '../assets/ai-bg.png';

export function AILandingPage() {
  return (
    <Layout>
      <div className="relative w-full">
        {/* Combined Background for AIHero and AIChatPreview */}
        <div 
          className="absolute inset-0 min-[850px]:inset-2.5 bg-[size:100%_auto] bg-top bg-no-repeat -z-10 rounded-br-4xl rounded-bl-4xl"
          style={{ backgroundImage: `url(${robotBg})`, backgroundColor: '#ffffff' }}
          aria-hidden="true"
        />
        <AIHero />
        <AIChatPreview />
      </div>
      
      <AgentFeature />
      <LogoTicker />
      <FeaturesGrid />
      <Testimonials />
      <HowItWorks />
      <Pricing />
    </Layout>
  );
}
