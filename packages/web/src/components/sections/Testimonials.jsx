import React from 'react';

export function Testimonials() {
  return (
    <section className="w-full bg-frame border-t border-b border-accent/15 px-6 py-32">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-16 text-4xl leading-tight font-medium text-neutral-900 sm:text-5xl lg:mb-20 lg:text-6xl dark:text-neutral-50">
          Trusted by teams worldwide
        </h2>
        <div className="mb-16 grid gap-8 lg:mb-20 lg:grid-cols-2 lg:gap-12">
          <div className="flex items-center justify-start gap-4 lg:gap-6">
            <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-accent"></div>
            <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-neutral-200"></div>
            <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-neutral-200"></div>
          </div>
          <div className="flex flex-col justify-center">
            <blockquote className="mb-6 text-xl leading-relaxed text-neutral-700 dark:text-neutral-300">
              “This platform completely transformed how our support team operates. Response times dropped by 60% and customer satisfaction is at an all-time high.”
            </blockquote>
            <div className="text-base font-medium text-neutral-900 sm:text-lg dark:text-neutral-100">
              Jennifer Walsh, <span className="text-neutral-500">VP of Customer Success @ Commandr</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
