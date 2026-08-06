import React, { useEffect } from 'react';
import { ReactLenis as Lenis } from 'lenis/react';
import { Header } from './Header';

export function Layout({ children }) {
  return (
    <div className="min-h-screen text-foreground font-sans antialiased">
      <Header />
      <main className="flex-1" id="main-content">
        {children}
      </main>
      <footer className="py-12 text-center text-sm text-muted-foreground bg-frame border-t border-accent/15">
        <p>&copy; {new Date().getFullYear()} mcode. All rights reserved.</p>
      </footer>
    </div>
  );
}
