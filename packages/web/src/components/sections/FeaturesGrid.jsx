import React from 'react';

export function FeaturesGrid() {
  return (
    <section className="w-full px-6 mb-32 bg-background">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-4">
          <div className="group bg-neutral-100 dark:bg-neutral-900 rounded-4xl p-8 overflow-hidden min-h-[400px] md:row-span-2 flex flex-col">
            <h3 className="text-2xl md:text-4xl font-medium text-neutral-900 dark:text-neutral-100 leading-tight mb-3">Guided Onboarding For Every Team</h3>
            <p className="text-neutral-500 text-sm">Get your team up and running in minutes with step-by-step walkthroughs</p>
          </div>
          <div className="group bg-neutral-50 dark:bg-neutral-800 rounded-4xl p-8 overflow-hidden min-h-[300px]">
            <h3 className="text-xl md:text-2xl font-medium text-neutral-900 dark:text-neutral-100 mb-3">Real-time Data</h3>
            <p className="text-neutral-500 text-sm">Monitor metrics, analytics, and team activity instantly</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="group bg-neutral-50 dark:bg-neutral-800 rounded-4xl p-6 md:p-8 flex flex-col items-center justify-center text-center min-h-[250px]">
              <h3 className="text-2xl md:text-3xl font-medium text-neutral-900 dark:text-neutral-100 mb-1">Trusted By</h3>
              <h3 className="text-2xl md:text-3xl font-medium text-neutral-900 dark:text-neutral-100 mb-5">254k+ Users</h3>
            </div>
            <div className="group bg-neutral-100 dark:bg-neutral-900 rounded-4xl p-6 md:p-8 flex flex-col min-h-[250px]">
              <h3 className="text-xl md:text-2xl font-medium text-neutral-900 dark:text-neutral-100 mb-2">Built to Scale</h3>
              <p className="text-neutral-500 text-sm">Enterprise-ready infrastructure that grows with you</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
