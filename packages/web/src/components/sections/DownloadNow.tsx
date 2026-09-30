import React from 'react';
import { Download, ArrowUpRight } from 'lucide-react';

/**
 * The "IDE" call to action: get the desktop app, or open the web IDE.
 *
 * Two different products, so they are kept visually distinct:
 *
 *   - **Download Now** → the Windows installer. A static .exe published into
 *     public/downloads by `npm run publish:ide`; the URL stays stable across
 *     version bumps.
 *   - **Web IDE** → the browser build. No install, works immediately.
 *
 * The three web modes map to real routes: AI Chat and the Code Editor are the
 * same screen (`/ai/chat` renders the chat, Monaco editor and terminal
 * together), and the Code Assistant is the agent dashboard (`/mcode`).
 */

const DOWNLOAD_URL = '/downloads/mcode-setup.exe';
const INSTALLER_SIZE_MB = 107;

const WEB_IDE_MODES = [
  { label: 'AI Chat', href: '/ai/chat', blurb: 'Talk to the model beside your code' },
  { label: 'AI Code Editor', href: '/ai/chat', blurb: 'Monaco editor + terminal, one screen' },
  { label: 'AI Code Assistant', href: '/mcode', blurb: 'God Mode and subagent orchestration' },
];

export function DownloadNow() {
  return (
    <section className="px-6 pt-16 pb-4 bg-white">
      <div className="mx-auto max-w-5xl rounded-2xl border border-black/10 bg-neutral-50 p-8 sm:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          {/* Desktop app */}
          <div className="max-w-sm">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black">
              mcode IDE for Desktop
            </span>
            <h2 className="mt-4 text-3xl font-medium tracking-tight text-black">
              Download it. Run it locally.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">
              A native Windows app — AI chat, code editor, terminal and agent mode
              in one window. No browser tabs, no address bar.
            </p>

            <a
              href={DOWNLOAD_URL}
              download
              className="group mt-6 inline-flex items-center gap-3 rounded-xl bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              <Download className="h-4 w-4" />
              Download Now
            </a>
            <p className="mt-2.5 text-xs text-neutral-500">
              Windows 10/11 · x64 · {INSTALLER_SIZE_MB} MB · unsigned build
            </p>
          </div>

          {/* Web IDE */}
          <div className="flex-1 lg:border-l lg:border-black/10 lg:pl-8">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black">
              mcode Web IDE
            </span>
            <p className="mt-4 text-sm leading-relaxed text-neutral-600">
              Prefer the browser? Nothing to install — these three open straight
              in a tab.
            </p>

            <div className="mt-5 space-y-2.5">
              {WEB_IDE_MODES.map((mode) => (
                <a
                  key={mode.label}
                  href={mode.href}
                  className="group flex items-center justify-between gap-4 rounded-xl border border-black/10 bg-white px-4 py-3 transition hover:border-black/25"
                >
                  <span>
                    <span className="block text-sm font-medium text-black">{mode.label}</span>
                    <span className="block text-xs text-neutral-500">{mode.blurb}</span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-neutral-400 transition group-hover:text-black" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}