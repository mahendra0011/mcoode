import React from 'react';
import { motion } from 'framer-motion';
import { FolderTree, Code2, Terminal, GitBranch, Play, Search, TestTube2, Globe, Container, Smartphone } from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] } }
};

const idePanels = [
  {
    icon: FolderTree,
    title: 'File Explorer',
    desc: 'Browse and manage your project\'s full file tree with inline file operations.'
  },
  {
    icon: Code2,
    title: 'Monaco Editor',
    desc: 'The same professional editor engine that powers VS Code, built natively into the web surface.'
  },
  {
    icon: Terminal,
    title: 'Multi-Terminal',
    desc: 'Run and manage multiple interactive xterm.js terminal sessions side by side.'
  },
  {
    icon: GitBranch,
    title: 'Source Control',
    desc: 'Stage, commit, view diffs, and manage branches without leaving your editing workspace.'
  },
  {
    icon: Play,
    title: 'Run & Debug',
    desc: 'Launch and debug Node.js and browser configurations inline with breakpoint support.'
  },
  {
    icon: Search,
    title: 'Project Search',
    desc: 'Fast regex search and replace across your entire workspace.'
  },
  {
    icon: TestTube2,
    title: 'Testing Panel',
    desc: 'Run, filter, and inspect Vitest/Jest test suite results directly inside the IDE.'
  },
  {
    icon: Globe,
    title: 'Remote Explorer',
    desc: 'Browse, manage, and edit code across remote SSH and cloud workspace environments.'
  },
  {
    icon: Container,
    title: 'Containers',
    desc: 'Inspect, manage, and tail logs for Docker containers via native dockerode integration.'
  },
  {
    icon: Smartphone,
    title: 'Android Emulators',
    desc: 'Launch, control, and preview Android emulator instances inline for mobile development.'
  }
];

export function IDEPaneShowcase() {
  return (
    <section className="w-full px-6 py-20 bg-background">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <motion.h2
            className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight text-neutral-900 dark:text-neutral-100 mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Built-In <span className="italic font-serif text-accent">IDE Panels</span>
          </motion.h2>
          <motion.p
            className="text-lg text-neutral-500 max-w-2xl mx-auto font-medium"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Every developer tool you need integrated into a single unified workspace — no extensions required.
          </motion.p>
        </div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {idePanels.map((panel) => {
            const Icon = panel.icon;
            return (
              <motion.div
                key={panel.title}
                className="group bg-neutral-100 dark:bg-neutral-900 rounded-4xl p-5 flex flex-col justify-between min-h-[200px] border border-neutral-200/50 dark:border-neutral-800/50"
                variants={item}
                whileHover={{ scale: 1.03, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              >
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-accent/15 flex items-center justify-center text-accent mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                    {panel.title}
                  </h3>
                  <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                    {panel.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
