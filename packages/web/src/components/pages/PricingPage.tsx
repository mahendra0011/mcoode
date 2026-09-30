"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, HelpCircle, Shield, Zap, Sparkles, Terminal, Code, Cpu, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Layout } from '../layout/Layout';

interface PlanFeature {
  name: string;
  starter: boolean | string;
  premium: boolean | string;
  enterprise: boolean | string;
}

const COMPARISON_FEATURES: { category: string; features: PlanFeature[] }[] = [
  {
    category: "AI Engines & Models",
    features: [
      { name: "Bring Your Own Key (BYOK)", starter: true, premium: true, enterprise: true },
      { name: "Free Mock / Sandbox Mode", starter: true, premium: true, enterprise: true },
      { name: "Multi-Model Auto-Fallback", starter: "Basic", premium: "Priority", enterprise: "Custom Cascades" },
      { name: "Included Cloud Fast Credits", starter: "500 credits/mo", premium: "5,000 credits/mo", enterprise: "Unlimited / Pooled" },
      { name: "Claude 3.5 Sonnet / Opus access", starter: "BYOK", premium: "Included + BYOK", enterprise: "Dedicated SLA" },
      { name: "GPT-4o & o1-preview access", starter: "BYOK", premium: "Included + BYOK", enterprise: "Dedicated SLA" },
      { name: "Local LLM via Ollama / LM Studio", starter: true, premium: true, enterprise: true },
    ]
  },
  {
    category: "Autonomous Swarms & Modes",
    features: [
      { name: "God Mode Autonomous Engine", starter: "10 runs/day", premium: "Unlimited", enterprise: "Unlimited Parallel" },
      { name: "Subagent Parallel Waves", starter: "Max 3 waves", premium: "Max 10 waves", enterprise: "Custom Waves" },
      { name: "Architect & Review Modes", starter: true, premium: true, enterprise: true },
      { name: "Background Watch Daemon", starter: true, premium: true, enterprise: true },
      { name: "Auto-Heal & Test-Driven Fixes", starter: "Single file", premium: "Multi-package", enterprise: "Monorepo scale" },
    ]
  },
  {
    category: "Tools, MCP & Extensions",
    features: [
      { name: "Built-in CLI Tools (46+ tools)", starter: true, premium: true, enterprise: true },
      { name: "Custom MCP Server Connections", starter: "Up to 3", premium: "Unlimited", enterprise: "Private Registry" },
      { name: "Plugin Registry Access", starter: true, premium: true, enterprise: true },
      { name: "Curated Skills (15+ workflows)", starter: true, premium: true, enterprise: true },
      { name: "Encrypted AES-256 Vault", starter: true, premium: true, enterprise: true },
    ]
  },
  {
    category: "Platforms & Support",
    features: [
      { name: "Terminal CLI (npm / brew / curl)", starter: true, premium: true, enterprise: true },
      { name: "Web IDE (In-browser workspace)", starter: true, premium: true, enterprise: true },
      { name: "VS Code Extension", starter: true, premium: true, enterprise: true },
      { name: "Desktop IDE App (Win / Mac / Linux)", starter: true, premium: true, enterprise: true },
      { name: "Support Level", starter: "Community Discord", premium: "Priority Email & Discord", enterprise: "Dedicated Slack & CSM" },
      { name: "SOC2 Compliance & SSO / SAML", starter: false, premium: false, enterprise: true },
    ]
  }
];

const FAQS = [
  {
    q: "Can I use my own API keys (Anthropic, OpenAI, OpenRouter)?",
    a: "Yes! mcode is BYOK (Bring Your Own Key) first. All your keys are encrypted locally using AES-256-GCM in your OS vault. You only pay provider token costs directly or use our bundled credits."
  },
  {
    q: "Do I get access to the CLI, Web IDE, VS Code Extension, and Desktop App?",
    a: "Yes! Every plan includes access to all 4 platforms: the CLI, the Web IDE, the official VS Code Extension, and the standalone Desktop IDE."
  },
  {
    q: "How does the 14-day free trial work?",
    a: "You get full Premium tier access for 14 days without any commitment. You can explore autonomous God Mode, test parallel subagent swarms, and connect MCP servers."
  },
  {
    q: "Can I run mcode completely offline or air-gapped?",
    a: "Absolutely. With local Ollama or LM Studio models configured and local tool execution, mcode operates completely without an internet connection."
  },
  {
    q: "What is God Mode?",
    a: "God Mode is mcode's multi-agent orchestrator. You specify an objective (e.g., 'Refactor auth to Lucia and add passkey support'), and mcode plans the steps, dispatches parallel subagents to execute them, runs tests, and integrates the diff automatically."
  }
];

export function PricingPage() {
  const [annual, setAnnual] = useState(true);

  return (
    <Layout>
      <div className="relative pt-28 pb-20 px-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Transparent Pricing
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground mb-6">
            Invest in Speed. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Ship 10x Faster with AI.
            </span>
          </h1>
          <p className="text-lg text-muted-foreground">
            One subscription unlocks mcode across your terminal, browser, VS Code, and desktop IDE.
          </p>

          {/* Billing Switch */}
          <div className="mt-8 inline-flex items-center gap-3 p-1.5 rounded-full bg-foreground/5 border border-foreground/10">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                !annual ? "bg-foreground text-background shadow-md" : "text-foreground/70 hover:text-foreground"
              }`}
            >
              Monthly billing
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                annual ? "bg-foreground text-background shadow-md" : "text-foreground/70 hover:text-foreground"
              }`}
            >
              <span>Annual billing</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-black">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-8 lg:grid-cols-3 mb-24 items-stretch">
          {/* Starter */}
          <div className="relative flex flex-col rounded-3xl border border-foreground/10 bg-frame p-8 shadow-xl">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-foreground">Starter</h3>
              <p className="text-sm text-muted-foreground mt-1">For indie hackers and developers exploring agentic coding.</p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-foreground">
                  ${annual ? "19" : "24"}
                </span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </div>
            </div>

            <ul className="space-y-3.5 mb-8 flex-1 text-sm text-foreground/85">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>All 4 Platforms (CLI, Web, VS Code, Desktop)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Bring Your Own API Keys (Unlimited BYOK)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>500 fast cloud credits / month</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>10 God Mode agent runs / day</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>46+ built-in tools & 3 MCP servers</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>AES-256 encrypted local vault</span>
              </li>
            </ul>

            <Link
              href="/signup?plan=starter"
              className="w-full text-center py-3 px-4 rounded-xl border border-foreground/20 hover:border-foreground/40 bg-foreground/5 hover:bg-foreground/10 text-foreground font-semibold text-sm transition-all"
            >
              Start 14-day Free Trial
            </Link>
          </div>

          {/* Premium / Pro (Popular) */}
          <div className="relative flex flex-col rounded-3xl border-2 border-emerald-500 bg-gradient-to-b from-emerald-500/10 via-frame to-frame p-8 shadow-2xl scale-[1.03]">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-500 text-black text-xs font-bold uppercase tracking-wider shadow-lg">
              Most Popular
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                Premium Pro <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
              </h3>
              <p className="text-sm text-muted-foreground mt-1">For professional engineers and high-velocity shipping teams.</p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-foreground">
                  ${annual ? "79" : "99"}
                </span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </div>
            </div>

            <ul className="space-y-3.5 mb-8 flex-1 text-sm text-foreground/90">
              <li className="flex items-center gap-2.5 font-medium text-emerald-300">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Unlimited God Mode Autonomous Engine</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>5,000 fast cloud credits / month</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Up to 10 parallel subagent waves</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Unlimited MCP Server connections</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Watch daemon multi-package auto-healing</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Priority model routing & intelligent fallback</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Priority Email & Discord Engineer Support</span>
              </li>
            </ul>

            <Link
              href="/signup?plan=premium"
              className="w-full text-center py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all"
            >
              Get Started with Premium
            </Link>
          </div>

          {/* Enterprise */}
          <div className="relative flex flex-col rounded-3xl border border-foreground/10 bg-frame p-8 shadow-xl">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-foreground">Enterprise</h3>
              <p className="text-sm text-muted-foreground mt-1">For organizations requiring compliance, dedicated pools, and custom workflows.</p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-foreground">Custom</span>
              </div>
            </div>

            <ul className="space-y-3.5 mb-8 flex-1 text-sm text-foreground/85">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Custom agent topologies & wave limits</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Private internal MCP tool registry</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Dedicated model endpoints with strict zero-data retention</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>SAML / Okta / Azure AD Single Sign-On</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Audit logs, security compliance & SOC2 type II</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Dedicated Solution Architect & 99.9% uptime SLA</span>
              </li>
            </ul>

            <Link
              href="mailto:enterprise@mcode.dev?subject=Enterprise%20Plan%20Inquiry"
              className="w-full text-center py-3 px-4 rounded-xl border border-foreground/20 hover:border-foreground/40 bg-foreground/5 hover:bg-foreground/10 text-foreground font-semibold text-sm transition-all"
            >
              Contact Enterprise Sales
            </Link>
          </div>
        </div>

        {/* Full Feature Comparison Table */}
        <div className="mb-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold text-foreground">
              Compare All Features
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Every detail of what makes each tier unique.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-foreground/10 bg-frame/60">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-foreground/10 bg-foreground/[0.02]">
                  <th className="py-4 px-6 font-semibold text-foreground w-2/5">Capability</th>
                  <th className="py-4 px-6 font-semibold text-foreground w-1/5 text-center">Starter</th>
                  <th className="py-4 px-6 font-semibold text-emerald-400 w-1/5 text-center">Premium</th>
                  <th className="py-4 px-6 font-semibold text-foreground w-1/5 text-center">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_FEATURES.map((section, idx) => (
                  <React.Fragment key={idx}>
                    <tr className="bg-foreground/[0.04] border-t border-b border-foreground/10">
                      <td colSpan={4} className="py-2.5 px-6 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                        {section.category}
                      </td>
                    </tr>
                    {section.features.map((feat, fIdx) => (
                      <tr key={fIdx} className="border-b border-foreground/5 hover:bg-foreground/[0.02] transition-colors">
                        <td className="py-3 px-6 text-foreground font-medium">{feat.name}</td>
                        <td className="py-3 px-6 text-center text-muted-foreground">
                          {typeof feat.starter === 'boolean' ? (
                            feat.starter ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : "—"
                          ) : feat.starter}
                        </td>
                        <td className="py-3 px-6 text-center font-semibold text-foreground">
                          {typeof feat.premium === 'boolean' ? (
                            feat.premium ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : "—"
                          ) : feat.premium}
                        </td>
                        <td className="py-3 px-6 text-center text-muted-foreground">
                          {typeof feat.enterprise === 'boolean' ? (
                            feat.enterprise ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : "—"
                          ) : feat.enterprise}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQs */}
        <div className="max-w-3xl mx-auto mb-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <div key={i} className="p-5 rounded-2xl border border-foreground/10 bg-frame">
                <h3 className="font-semibold text-foreground text-base mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA Banner */}
        <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent p-8 sm:p-12 text-center relative overflow-hidden">
          <h2 className="text-2xl sm:text-4xl font-bold text-foreground mb-4">
            Ready to Build Faster with AI Swarms?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8 text-sm sm:text-base">
            Join thousands of developers using mcode to plan, code, and deploy in record time.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/signup"
              className="px-6 py-3 rounded-xl bg-foreground text-background font-semibold text-sm hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-2"
            >
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/cli"
              className="px-6 py-3 rounded-xl border border-foreground/20 bg-foreground/5 hover:bg-foreground/10 text-foreground font-semibold text-sm transition-all"
            >
              Install CLI (`npm i -g mcode`)
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
