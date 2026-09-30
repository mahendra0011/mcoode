import React from 'react';
import { Layout } from '../../components/layout/Layout';
import { CLIHero } from '../../components/sections/CLIHero';
import { CLIDemoPreview } from '../../components/sections/CLIDemoPreview';
import { CommandShowcase } from '../../components/sections/CommandShowcase';
import { AgentFeature } from '../../components/sections/AgentFeature';
import { LogoTicker } from '../../components/sections/LogoTicker';
import { FeaturesGrid } from '../../components/sections/FeaturesGrid';
import { Ecosystem } from '../../components/sections/Ecosystem';
import { Installation } from '../../components/sections/Installation';
import { HowItWorks } from '../../components/sections/HowItWorks';
import { Testimonials } from '../../components/sections/Testimonials';
import { Pricing } from '../../components/sections/Pricing';
import cliBg from '../../assets/cli-bg.png';

const bgUrl = typeof cliBg === 'string' ? cliBg : (cliBg as { src: string })?.src || '';

export function CLIPage() {
  return (
    <Layout>
      <div className="relative w-full">
        {/* Combined Background for CLIHero and CLIDemoPreview */}
        <div 
          className="absolute inset-0 min-[850px]:inset-2.5 bg-[size:100%_auto] bg-top bg-no-repeat -z-10 rounded-br-4xl rounded-bl-4xl"
          style={{ backgroundImage: `url(${bgUrl})` }}
          aria-hidden="true"
        />
        <CLIHero />
        <CLIDemoPreview />
      </div>
      
      <CommandShowcase />
      
      <div className="relative w-full">
        <AgentFeature />
      </div>

      <LogoTicker />
      <FeaturesGrid />
      <Ecosystem />
      <Installation />
      <HowItWorks />
      <Testimonials />
      <Pricing />
    </Layout>
  );
}
