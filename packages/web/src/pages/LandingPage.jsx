import React from 'react';
import { Layout } from '../components/layout/Layout';
import { Hero } from '../components/sections/Hero';
import { DashboardPreview } from '../components/sections/DashboardPreview';
import { AgentFeature } from '../components/sections/AgentFeature';
import { LogoTicker } from '../components/sections/LogoTicker';
import { FeaturesGrid } from '../components/sections/FeaturesGrid';
import { Testimonials } from '../components/sections/Testimonials';
import { HowItWorks } from '../components/sections/HowItWorks';
import { Pricing } from '../components/sections/Pricing';
import heroBg from '../assets/hero-bg.png';

export function LandingPage() {
  return (
    <Layout>
      <div className="relative w-full">
        <div 
          className="absolute inset-0 min-[850px]:inset-2.5 bg-[size:100%_auto] bg-top bg-no-repeat -z-10 rounded-br-4xl rounded-bl-4xl"
          style={{ backgroundImage: `url(${heroBg})` }}
          aria-hidden="true"
        />
        <Hero />
        <DashboardPreview />
      </div>
      
      {/* 3rd Section: AI Agent Feature */}
      <AgentFeature />
      
      <LogoTicker />
      <FeaturesGrid />
      <Testimonials />
      <HowItWorks />
      <Pricing />
    </Layout>
  );
}
