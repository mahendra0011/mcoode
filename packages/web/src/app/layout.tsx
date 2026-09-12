import '../styles/index.css';
import type { ReactNode } from 'react';
import Providers from './providers';
import { McodeStartupOverlay } from '../components/mcode/McodeStartupOverlay';
import { PlatformDetect } from '../components/mcode/PlatformDetect';

// This app is a fully client-driven SPA (socket.io + Monaco + xterm all live
// in the browser). Disabling Next's static prerendering ensures no client-only
// code (useRouter, useSearchParams, localStorage, image imports, etc.) ever
// executes at build time — exactly matching the old Vite client-only behavior.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'mcode — terminal-first AI coding',
  description: 'mcode: AI coding assistant in your terminal and browser',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="m-0 bg-[#0c0c0c] text-white antialiased overflow-x-hidden">
        <Providers>{children}</Providers>
        <McodeStartupOverlay />
        <PlatformDetect />
      </body>
    </html>
  );
}

