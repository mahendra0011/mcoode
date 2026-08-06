import React from 'react';
import { CalendarCheck, Users, Rocket } from 'lucide-react';

export function HowItWorks() {
  return (
    <section className="relative w-full bg-background">
      <div className="mx-auto grid max-w-5xl gap-12 px-6 py-20 sm:py-28 lg:grid-cols-2 lg:gap-20">
        <div className="lg:sticky lg:top-48 lg:h-fit lg:self-start">
          <h2 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">How it works</h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-foreground/60">
            Your platform, configured by experts and launched on an <span className="font-medium text-foreground">Enterprise plan</span>, ready to grow with you.
          </p>
          <a href="#" className="mt-8 inline-flex items-center rounded-xl bg-foreground px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-foreground/90">
            Schedule kickoff
          </a>
        </div>
        <div className="relative">
          <div className="absolute left-6 top-6 h-[calc(100%-6rem)] w-0.5 -translate-x-1/2 bg-foreground/10">
            <div className="w-full bg-accent" style={{ height: '50%' }}></div>
          </div>
          <ol className="relative list-none p-0 m-0">
            <li>
              <div className="relative flex gap-5 pb-32">
                <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent">
                  <CalendarCheck className="h-5 w-5 text-black" />
                </div>
                <div className="pt-1">
                  <h3 className="text-xl font-semibold text-foreground sm:text-2xl">Schedule kickoff</h3>
                  <p className="mt-2 max-w-sm text-base leading-relaxed text-foreground/60">Align on scope, structure, and timeline. Whether it's a quick setup or a full migration, we'll take it from there.</p>
                </div>
              </div>
            </li>
            <li>
              <div className="relative flex gap-5 pb-32">
                <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent">
                  <Users className="h-5 w-5 text-black" />
                </div>
                <div className="pt-1">
                  <h3 className="text-xl font-semibold text-foreground sm:text-2xl">Real-time collaboration</h3>
                  <p className="mt-2 max-w-sm text-base leading-relaxed text-foreground/60">Work alongside our team with full visibility. Every step follows best practices and thorough QA to ensure quality.</p>
                </div>
              </div>
            </li>
            <li>
              <div className="relative flex gap-5">
                <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent">
                  <Rocket className="h-5 w-5 text-black" />
                </div>
                <div className="pt-1">
                  <h3 className="text-xl font-semibold text-foreground sm:text-2xl">Launch and scale</h3>
                  <p className="mt-2 max-w-sm text-base leading-relaxed text-foreground/60">Go live with confidence. Our AI continuously learns and improves, helping your team scale effortlessly.</p>
                </div>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}
