"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import {
  Check, Sparkles, Shield, Zap, Terminal, HelpCircle,
  ChevronDown, ChevronUp, ArrowRight, Star
} from 'lucide-react';
import { Layout } from '../layout/Layout';
import { toast } from 'sonner';

interface PricingTier {
  id: string;
  name: string;
  badge?: string;
  priceMonthly: number;
  priceYearly: number;
  desc: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

const TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Community (BYOK)',
    priceMonthly: 0,
    priceYearly: 0,
    desc: 'For individual developers using their own API keys or running local models.',
    features: [
      'Unlimited local CLI & Desktop usage',
      'Bring Your Own Keys (OpenAI, Anthropic, Gemini, Groq, Ollama)',
      'Local AES-256 hardware-backed vault',
      'Full 46+ built-in MCP tools catalog',
      'Community Discord & GitHub support',
    ],
    cta: 'Get Started Free',
  },
  {
    id: 'pro',
    name: 'Developer Pro',
    badge: 'MOST POPULAR',
    priceMonthly: 19,
    priceYearly: 15,
    desc: 'For professional software engineers who want hosted cloud models and fast swarms.',
    features: [
      'Everything in Community',
      '$30 monthly included Cloud AI credits',
      'Parallel God Mode swarms (up to 5 concurrent)',
      'Cloud Web IDE workspace sync',
      'Priority routing & ultra-fast reasoning models',
      'Background auto-heal test watcher',
    ],
    cta: 'Start 14-Day Free Trial',
    highlighted: true,
  },
  {
    id: 'team',
    name: 'Team Swarms',
    badge: 'FOR TEAMS',
    priceMonthly: 49,
    priceYearly: 39,
    desc: 'For engineering teams collaborating on shared codebases and unified API budgets.',
    features: [
      'Everything in Pro',
      'Shared Team Vault (unified keys & budget caps)',
      'Up to 20 concurrent parallel subagents',
      'Private team MCP server registry',
      'Team audit logs & Git security scan',
      'Priority email & Slack support',
    ],
    cta: 'Create Team Workspace',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthly: 0,
    priceYearly: 0,
    desc: 'For organizations with strict compliance, on-prem security, and custom SLAs.',
    features: [
      'Self-hosted air-gapped VPC deployment',
      'Custom LLM fine-tuning & private endpoints',
      'Single Sign-On (SAML / Okta / Azure AD)',
      'Dedicated 99.9% uptime SLA',
      '24/7 dedicated engineering support',
      'Custom invoice billing & security audit',
    ],
    cta: 'Contact Sales',
  },
];

const FAQS = [
  { q: 'Can I use mcode completely for free?', a: 'Yes! The Community edition is 100% free and open-source. Simply add your existing API keys (from Anthropic, OpenAI, Google, etc.) or connect local Ollama models on your GPU. There are no artificial limits.' },
  { q: 'How does Bring Your Own Key (BYOK) work?', a: 'Your API keys are stored locally on your machine in an AES-256 encrypted vault backed by Windows DPAPI, macOS Keychain, or Linux SecretService. Keys are never sent to our servers.' },
  { q: 'What happens when I hit my God Mode concurrency cap?', a: 'Subagent tasks wait in an optimized dependency queue (DAG) and execute as previous subagents complete. Upgrading to Pro or Team unlocks higher concurrency (5 to 20 parallel waves).' },
  { q: 'Can I cancel or switch plans at any time?', a: 'Yes. You can upgrade, downgrade, or cancel your subscription at any time with one click from the billing dashboard. Annual plans will be prorated automatically.' },
  { q: 'Does mcode train on my proprietary source code?', a: 'Never. We have zero-retention agreements with enterprise AI providers. Your code, context tokens, and git diffs are strictly processed in-memory and never logged or stored for model training.' },
];

export function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleCta = (tier: PricingTier) => {
    if (tier.id === 'free') {
      window.location.href = '/cli';
    } else if (tier.id === 'enterprise') {
      toast.info('Enterprise inquiry form: sales@mcode.dev');
    } else {
      toast.success(`Redirecting to checkout for ${tier.name}...`);
    }
  };

  return (
    <Layout>
      {/* ─────────────────── HERO ─────────────────── */}
      <section className="relative pt-36 pb-20 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[400px] bg-gradient-to-tr from-emerald-200/40 via-teal-100/35 to-indigo-200/40 blur-[130px] rounded-full pointer-events-none -z-10 animate-pulse-glow" />

        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-neutral-200 shadow-sm text-emerald-800 text-xs font-bold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Transparent & Developer-Friendly Pricing</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-neutral-950 max-w-4xl mx-auto leading-[1.1] mb-6 font-sans">
            Simple Pricing for Solo Devs{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">
              & Engineering Teams
            </span>
          </h1>

          <p className="text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto leading-relaxed mb-10">
            Bring your own API keys for 100% free unlimited local usage, or choose Cloud Swarms for hosted subagents and team synchronization.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center gap-3 mb-16">
            <span className={`text-xs font-bold ${billingCycle === 'monthly' ? 'text-neutral-950' : 'text-neutral-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle((b) => (b === 'monthly' ? 'yearly' : 'monthly'))}
              className="w-13 h-7 rounded-full bg-neutral-200 p-1 flex items-center transition-colors relative cursor-pointer"
            >
              <div
                className={`w-5 h-5 rounded-full bg-emerald-600 transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-xs font-bold flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'text-neutral-950' : 'text-neutral-500'}`}>
              <span>Yearly</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                SAVE 20%
              </span>
            </span>
          </div>

          {/* ─────────────────── TIERS GRID ─────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left max-w-6xl mx-auto mb-24">
            {TIERS.map((tier) => {
              const price = billingCycle === 'yearly' ? tier.priceYearly : tier.priceMonthly;
              return (
                <div
                  key={tier.id}
                  className={`p-6 rounded-3xl flex flex-col justify-between transition-all relative ${
                    tier.highlighted
                      ? 'bg-white border-2 border-emerald-500 shadow-[0_15px_40px_-10px_rgba(16,185,129,0.25)] scale-[1.02]'
                      : 'bg-white border border-neutral-200 shadow-sm hover:shadow-lg'
                  }`}
                >
                  {tier.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold tracking-wider shadow-sm">
                      {tier.badge}
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-bold text-neutral-950 mb-1">{tier.name}</h3>
                    <p className="text-xs text-neutral-500 leading-relaxed mb-5 min-h-[36px]">{tier.desc}</p>

                    <div className="mb-6 flex items-baseline gap-1">
                      {tier.id === 'enterprise' ? (
                        <span className="text-3xl font-black text-neutral-950">Custom</span>
                      ) : (
                        <>
                          <span className="text-4xl font-black text-neutral-950 font-sans">${price}</span>
                          <span className="text-xs text-neutral-500">/ {tier.id === 'team' ? 'seat / mo' : 'mo'}</span>
                        </>
                      )}
                    </div>

                    <div className="space-y-3 mb-8">
                      {tier.features.map((feat) => (
                        <div key={feat} className="flex items-start gap-2.5 text-xs text-neutral-700">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCta(tier)}
                    className={`w-full py-3.5 rounded-full font-bold text-xs transition-all cursor-pointer ${
                      tier.highlighted
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                    }`}
                  >
                    {tier.cta}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────── FAQS ─────────────────── */}
      <section className="py-20 border-t border-neutral-200/80 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-neutral-950 mb-3">Frequently Asked Questions</h2>
            <p className="text-neutral-600 text-sm">Everything you need to know about mcode subscriptions and security.</p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div
                key={faq.q}
                className="rounded-2xl border border-neutral-200 bg-neutral-50/70 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full p-4 flex items-center justify-between text-left text-sm font-bold text-neutral-900 cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 text-xs text-neutral-600 leading-relaxed border-t border-neutral-200/80 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
