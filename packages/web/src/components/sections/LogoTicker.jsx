import React from 'react';

export function LogoTicker() {
  return (
    <div className="pt-24 pb-12 overflow-hidden">
      <div className="flex justify-center px-6">
        <div className="relative max-w-5xl w-full mask-linear-gradient">
          <div className="flex w-max animate-pulse opacity-50">
            {/* Logos Placeholder */}
            <div className="flex gap-12 text-2xl font-bold uppercase tracking-widest text-neutral-400">
              <span>Acme Corp</span>
              <span>Altshift</span>
              <span>Biosynthesis</span>
              <span>Boltshift</span>
              <span>Capsule</span>
              <span>Catalog</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
