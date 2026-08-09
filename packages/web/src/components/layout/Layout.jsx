import React, { useEffect } from 'react';
import { ReactLenis as Lenis } from 'lenis/react';
import { motion } from 'framer-motion';
import { Header } from './Header';

export function Layout({ children }) {
  return (
    <div className="min-h-screen text-foreground font-sans antialiased">
      <Header />
      <motion.main
        className="flex-1"
        id="main-content"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        {children}
      </motion.main>
      <motion.footer
        className="py-12 text-center text-sm text-muted-foreground bg-frame border-t border-accent/15"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
      >
        <p>&copy; {new Date().getFullYear()} mcode. All rights reserved.</p>
      </motion.footer>
    </div>
  );
}
