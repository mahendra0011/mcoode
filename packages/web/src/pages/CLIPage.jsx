import React from 'react';
import { Layout } from '../components/layout/Layout';
import { CLIHero } from '../components/sections/CLIHero';
import { CLIDemoPreview } from '../components/sections/CLIDemoPreview';
import { FeaturesGrid } from '../components/sections/FeaturesGrid';
import { HowItWorks } from '../components/sections/HowItWorks';
import { Pricing } from '../components/sections/Pricing';
import cliBg from '../assets/cli-bg.png';

export function CLIPage() {
  return (
    <Layout>
      <div className="relative w-full">
        {/* Combined Background for CLIHero and CLIDemoPreview */}
        <div 
          className="absolute inset-0 min-[850px]:inset-2.5 bg-[size:100%_auto] bg-top bg-no-repeat -z-10 rounded-br-4xl rounded-bl-4xl"
          style={{ backgroundImage: `url(${cliBg})` }}
          aria-hidden="true"
        />
        <CLIHero />
        <CLIDemoPreview />
      </div>
      
      <FeaturesGrid />
      <HowItWorks />
      <Pricing />
    </Layout>
  );
}
