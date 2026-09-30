import React from 'react';
import { Layout } from '../../components/layout/Layout';

/**
 * Download page for the Windows desktop build.
 *
 * The `.exe` is a normal static file served from `public/downloads`, so the
 * button is a plain anchor with `download` — no API route, and the binary is
 * never bundled into the app.
 */

/** Kept in sync with packages/desktop/package.json. */
const IDE_VERSION = '2.4.6';

/**
 * Published installer path. `npm run publish:ide` in packages/desktop copies the
 * built NSIS installer to public/downloads under this name, so the URL stays
 * stable across version bumps.
 */
const DOWNLOAD_URL = '/downloads/mcode-setup.exe';
const INSTALLER_SIZE_MB = 107;

const FEATURES = [
  {
    title: 'Chat + editor + terminal',
    body: 'One window instead of three. Talk to the model while the Monaco editor and a real shell sit right beside it.',
  },
  {
    title: 'AI Code Agent mode',
    body: 'God Mode, subagent orchestration and the Turn Machine — plan, dispatch and watch every step land.',
  },
  {
    title: 'Sessions that persist',
    body: 'Every conversation is saved. Pick up any thread from the session history without losing context.',
  },
  {
    title: 'Your own machine',
    body: 'Runs against your local Docker stack. Your code and your keys never leave the box.',
  },
];

const STEPS = [
  { n: 1, title: 'Install', body: 'Run the installer. It adds a Start Menu and Desktop shortcut.' },
  { n: 2, title: 'Start the stack', body: 'The app talks to the local web app, so Docker has to be up.' },
  { n: 3, title: 'Launch and sign in', body: 'The window opens straight on the login screen — no marketing pages.' },
];

export function IdePage() {
  return (
    <Layout>
      <div className="min-h-screen bg-[#0c0c0c] text-white">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-6 pt-24 pb-20 text-center">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                'radial-gradient(60% 50% at 50% 0%, rgba(34,197,94,0.18), transparent 70%)',
            }}
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Windows · v{IDE_VERSION}
            </span>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">
              mcode <span className="text-emerald-400">Desktop IDE</span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/60">
              The full mcode workspace — AI chat, code editor, terminal and agent
              orchestration — as a native Windows application. No browser tabs,
              no address bar.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={DOWNLOAD_URL}
                download
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-emerald-400 sm:w-auto"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Download for Windows
                <span className="font-normal opacity-60">· {INSTALLER_SIZE_MB} MB</span>
              </a>

              <a
                href="/docs"
                className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 px-6 py-3.5 text-sm font-medium text-white/80 transition hover:bg-white/5 sm:w-auto"
              >
                Read the docs
              </a>
            </div>

            <p className="mt-4 text-xs text-white/35">Windows 10/11 · x64 · unsigned build</p>
          </div>
        </section>

        {/* ── Requirements ─────────────────────────────────────────────────── */}
        <section className="px-6 pb-16">
          <div className="mx-auto max-w-2xl rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-300">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Before you download
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              The app is a window onto the mcode web app, which runs in Docker on
              your machine. Start the stack once, then the IDE connects to it:
            </p>
            <code className="mt-3 block overflow-x-auto rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-xs text-emerald-300">
              docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
            </code>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────────────────── */}
        <section className="px-6 pb-20">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Everything, in one window
          </h2>
          <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 transition hover:border-white/15"
              >
                <h3 className="text-sm font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Steps ────────────────────────────────────────────────────────── */}
        <section className="px-6 pb-28">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Up in three steps
          </h2>
          <ol className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-semibold text-emerald-400">
                  {s.n}
                </span>
                <h3 className="mt-4 text-sm font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{s.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-14 flex justify-center">
            <a
              href={DOWNLOAD_URL}
              download
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-7 py-3.5 text-sm font-semibold text-black transition hover:bg-emerald-400"
            >
              Download mcode IDE
              <span className="font-normal opacity-60">· v{IDE_VERSION}</span>
            </a>
          </div>
        </section>
      </div>
    </Layout>
  );
}