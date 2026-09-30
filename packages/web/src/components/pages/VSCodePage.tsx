import React from 'react';
import { Layout } from '../layout/Layout';
import { VSCodeHero } from '../sections/VSCodeHero';
import { VSCodeExtensionPreview } from '../sections/VSCodeExtensionPreview';
import { AgentFeature } from '../sections/AgentFeature';
import { VSCodeScopeComparison } from '../sections/VSCodeScopeComparison';
import { VSCodeInstallation } from '../sections/VSCodeInstallation';
import { LogoTicker } from '../sections/LogoTicker';
import { FeaturesGrid } from '../sections/FeaturesGrid';
import { HowItWorks } from '../sections/HowItWorks';
import { Pricing } from '../sections/Pricing';
import cliBg from '../../assets/cli-bg.png';

const bgUrl = typeof cliBg === 'string' ? cliBg : (cliBg as { src: string })?.src || '';

export function VSCodePage() {
  return (
    <Layout>
      <div className="relative w-full">
        <div 
          className="absolute inset-0 min-[850px]:inset-2.5 bg-[size:100%_auto] bg-top bg-no-repeat -z-10 rounded-br-4xl rounded-bl-4xl"
          style={{ backgroundImage: `url(${bgUrl})` }}
          aria-hidden="true"
        />
        <VSCodeHero />
        <VSCodeExtensionPreview />
      </div>

      <div className="relative w-full">
        <AgentFeature />
      </div>

      <VSCodeScopeComparison />
      <VSCodeInstallation />
      <LogoTicker />
      <FeaturesGrid />
      <HowItWorks />
      <Pricing />
    </Layout>
  );
}
