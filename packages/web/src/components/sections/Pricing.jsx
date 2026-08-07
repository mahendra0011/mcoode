import React from 'react';

export function Pricing() {
  return (
    <section id="pricing" className="w-full bg-background px-6 py-20 sm:py-28 scroll-mt-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center sm:mb-16">
          <span className="text-sm font-medium text-muted-foreground">Pricing</span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">Simple, transparent pricing</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">Choose the plan that works best for your team. All plans include a 14-day free trial.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {/* Starter Plan */}
          <div className="relative flex h-full flex-col rounded-2xl bg-frame p-6 sm:p-8 border border-border">
            <h3 className="text-xl font-semibold text-foreground">Starter</h3>
            <div className="mt-4">
              <div className="flex items-end gap-3">
                <span className="text-5xl font-bold tracking-tight text-foreground">$24</span>
                <span className="mb-1 text-sm text-muted-foreground">/month</span>
              </div>
            </div>
            <button className="mt-6 w-full rounded-xl py-3 text-sm font-semibold transition-colors bg-muted text-foreground hover:bg-muted/80">Get Started</button>
          </div>
          
          {/* Premium Plan */}
          <div className="relative flex h-full flex-col rounded-2xl bg-frame p-6 sm:p-8 border-2 border-accent">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="inline-block rounded-full bg-accent px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-black/50">Most Popular</span>
            </div>
            <h3 className="text-xl font-semibold text-foreground">Premium</h3>
            <div className="mt-4">
              <div className="flex items-end gap-3">
                <span className="text-5xl font-bold tracking-tight text-foreground">$99</span>
                <span className="mb-1 text-sm text-muted-foreground">/month</span>
              </div>
            </div>
            <button className="mt-6 w-full rounded-xl py-3 text-sm font-semibold transition-colors bg-accent text-black hover:bg-accent/90">Get Started</button>
          </div>

          {/* Enterprise Plan */}
          <div className="relative flex h-full flex-col rounded-2xl bg-frame p-6 sm:p-8 border border-border">
            <h3 className="text-xl font-semibold text-foreground">Enterprise</h3>
            <div className="mt-4">
              <div className="flex items-end gap-3">
                <span className="text-5xl font-bold tracking-tight text-foreground">Custom</span>
              </div>
            </div>
            <button className="mt-6 w-full rounded-xl py-3 text-sm font-semibold transition-colors bg-muted text-foreground hover:bg-muted/80">Contact Sales</button>
          </div>
        </div>
      </div>
    </section>
  );
}
