import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Store, FileCode2, Download } from 'lucide-react';

const installMethods = [
  {
    id: 'marketplace',
    label: 'VS Code Marketplace',
    icon: Store,
    title: 'Install from VS Code UI',
    instructions: '1. Open VS Code → Extensions tab (Ctrl+Shift+X / Cmd+Shift+X)\n2. Search "mcode"\n3. Click Install',
    cmd: 'code --install-extension mcode.mcode-vscode'
  },
  {
    id: 'vsix',
    label: 'Manual .vsix Install',
    icon: FileCode2,
    title: 'Install via CLI or .vsix',
    instructions: '1. Download mcode-vscode.vsix from release assets\n2. Run CLI command below',
    cmd: 'code --install-extension mcode-vscode.vsix'
  }
];

export function VSCodeInstallation() {
  const [activeTabId, setActiveTabId] = useState('marketplace');
  const [copied, setCopied] = useState(false);

  const activeMethod = installMethods.find((m) => m.id === activeTabId) || installMethods[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeMethod.cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="w-full px-6 py-20 bg-background">
      <motion.div
        className="max-w-4xl mx-auto text-center"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-neutral-900 dark:text-neutral-100 mb-4">
          How to <span className="italic font-serif text-accent">Install Extension</span>
        </h2>
        <p className="text-lg text-neutral-500 max-w-xl mx-auto mb-10 font-medium">
          Get mcode installed in VS Code via the official extension marketplace or direct `.vsix` download.
        </p>

        {/* Primary download CTA — direct .vsix, same stable-path convention as
            scripts/publish-ide.js uses for the desktop installer. */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <a
            href="/downloads/mcode-vscode.vsix"
            download
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-medium text-sm shadow-md hover:opacity-90 transition-opacity"
          >
            <Download className="w-4 h-4" />
            <span>Download Extension</span>
          </a>
          <a
            href="https://marketplace.visualstudio.com/items?itemName=mcode.mcode-vscode"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 font-medium text-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            <Store className="w-4 h-4" />
            <span>View on Marketplace</span>
          </a>
        </div>

        {/* Tab Buttons */}
        <div className="flex justify-center gap-2 mb-8">
          {installMethods.map((m) => {
            const Icon = m.icon;
            const isActive = activeTabId === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setActiveTabId(m.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-md'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Command Box */}
        <div className="relative max-w-2xl mx-auto rounded-3xl bg-neutral-950 text-white p-6 md:p-8 shadow-2xl border border-neutral-800 text-left font-mono">
          <p className="text-xs text-neutral-400 font-sans mb-3 whitespace-pre-line leading-relaxed">
            {activeMethod.instructions}
          </p>

          <div className="flex items-center justify-between gap-4 pt-3 border-t border-neutral-900">
            <span className="text-accent font-semibold text-sm whitespace-nowrap overflow-x-auto">
              {activeMethod.cmd}
            </span>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-sans font-medium text-white transition-colors shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-accent" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Command</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
