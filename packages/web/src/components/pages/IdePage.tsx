"use client";
import React from 'react';
import { Layout } from '../layout/Layout';
import { IDEHero } from '../sections/IDEHero';
import { IDEPreview } from '../sections/IDEPreview';
import { AgentFeature } from '../sections/AgentFeature';
import { IDEPaneShowcase } from '../sections/IDEPaneShowcase';
import { DownloadNow } from '../sections/DownloadNow';
import { LogoTicker } from '../sections/LogoTicker';
import { FeaturesGrid } from '../sections/FeaturesGrid';
import { HowItWorks } from '../sections/HowItWorks';
import { Testimonials } from '../sections/Testimonials';
import { Pricing } from '../sections/Pricing';
import heroBg from '../../assets/hero-bg.png';

const bgUrl = typeof heroBg === 'string' ? heroBg : (heroBg as { src: string })?.src || '';

export function IDEPage() {
  return (
    <Layout>
      <div className="relative w-full">
        <div 
          className="absolute inset-0 min-[850px]:inset-2.5 bg-[size:100%_auto] bg-top bg-no-repeat -z-10 rounded-br-4xl rounded-bl-4xl"
          style={{ backgroundImage: `url(${bgUrl})` }}
          aria-hidden="true"
        />
        <IDEHero />
        <IDEPreview />
      </div>

      <DownloadNow />

      <div className="relative w-full">
        <AgentFeature />
      </div>

      <IDEPaneShowcase />
      <LogoTicker />
      <FeaturesGrid />
      <HowItWorks />
      <Testimonials />
      <Pricing />
    </Layout>
  );
}