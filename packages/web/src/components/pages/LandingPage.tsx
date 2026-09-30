"use client";
import React from 'react';
import { Layout } from '../layout/Layout';
import { Hero } from '../sections/Hero';
import { DashboardPreview } from '../sections/DashboardPreview';
import { AgentFeature } from '../sections/AgentFeature';
import { PlatformShowcase } from '../sections/PlatformShowcase';
import { ModesShowcase } from '../sections/ModesShowcase';
import { GodModeDeepDive } from '../sections/GodModeDeepDive';
import { McpAndToolsShowcase } from '../sections/McpAndToolsShowcase';
import { FeaturesGrid } from '../sections/FeaturesGrid';
import { Ecosystem } from '../sections/Ecosystem';
import { LogoTicker } from '../sections/LogoTicker';
import { HowItWorks } from '../sections/HowItWorks';
import { Testimonials } from '../sections/Testimonials';
import { Pricing } from '../sections/Pricing';
import heroBg from '../../assets/hero-bg.png';

const bgUrl = typeof heroBg === 'string' ? heroBg : (heroBg as { src: string })?.src || '';

export function LandingPage() {
  return (
    <Layout>
      {/* Starting 2 sections (Hero + DashboardPreview) kept 100% UNCHANGED */}
      <div className="relative w-full">
        <div 
          className="absolute inset-0 min-[850px]:inset-2.5 bg-[size:100%_auto] bg-top bg-no-repeat -z-10 rounded-br-4xl rounded-bl-4xl"
          style={{ backgroundImage: `url(${bgUrl})` }}
          aria-hidden="true"
        />
        <Hero />
        <DashboardPreview />
      </div>
      
      {/* 3rd Section: AI Agent Feature (Robot Video Parallax) */}
      <div className="relative w-full">
        <AgentFeature />
      </div>

      {/* 4th Section: Platform Showcase (CLI, Web IDE, VS Code, Desktop IDE) */}
      <PlatformShowcase />

      {/* 5th Section: 3 Working Modes (Chat, God Mode, Editor) */}
      <ModesShowcase />

      {/* 6th Section: God Mode Autonomous Engine Deep Dive */}
      <GodModeDeepDive />

      {/* 7th Section: MCP, 46+ Tools, Plugins, Skills & Vault */}
      <McpAndToolsShowcase />

      {/* 8th Section: Ecosystem Stats */}
      <Ecosystem />

      {/* 9th Section: Features Grid (Bento) */}
      <FeaturesGrid />

      {/* 10th Section: Model & Provider Logos Ticker */}
      <LogoTicker />

      {/* 11th Section: How It Works Flow */}
      <HowItWorks />

      {/* 12th Section: Testimonials */}
      <Testimonials />

      {/* 13th Section: Pricing Section (with id="pricing" for smooth scroll & direct access) */}
      <Pricing />
    </Layout>
  );
}
