import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Cpu, Layers, Workflow, Code2, Store } from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] } }
};

const ecosystemItems = [
  {
    icon: Cpu,
    title: 'MCP Servers',
    bigNumber: '46 Tools',
    subText: 'across 3 MCP servers',
    desc: 'High-risk tools require explicit approval with system side-effect scope — safety by default, not an afterthought.'
  },
  {
    icon: Layers,
    title: 'Plugins',
    bigNumber: '7 Active',
    subText: 'built-in plugins',
    desc: 'Each with its own tool count, manifest, and cache — installable directly from the plugin marketplace.'
  },
  {
    icon: Workflow,
    title: 'Skills',
    bigNumber: '15 Skills',
    subText: 'curated workflows',
    desc: '6 mcode-guide skills, 4 developer-tool skills (Android, browser, GUI testing, iOS), 3 document skills (docx, pdf, pptx).'
  },
  {
    icon: Code2,
    title: 'Languages',
    bigNumber: 'Piston Engine',
    subText: 'sandbox execution',
    desc: 'Runs code across dozens of languages via the open-source engine — with a static fallback if unreachable.'
  }
];

export function Ecosystem() {
  return (
    <section className="w-full px-6 py-20 bg-background">
      <motion.div
        className="max-w-5xl mx-auto"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        variants={container}
      >
        <div className="text-center mb-16">
          <motion.h2
            className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight text-neutral-900 dark:text-neutral-100 mb-4"
            variants={item}
          >
            Built for an <span className="italic font-serif text-accent">Extensible Engine</span>
          </motion.h2>
          <motion.p
            className="text-lg text-neutral-500 max-w-2xl mx-auto font-medium"
            variants={item}
          >
            Connect your tools, skills, and execution environments directly to mcode's agent pipeline.
          </motion.p>
        </div>

        {/* 4 Wide Stat Cards */}
        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" variants={container}>
          {ecosystemItems.map((eco) => (
            <motion.div
              key={eco.title}
              className="group bg-neutral-100 dark:bg-neutral-900 rounded-4xl p-6 flex flex-col justify-between min-h-[280px] border border-neutral-200/50 dark:border-neutral-800/50"
              variants={item}
              whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-accent/15 flex items-center justify-center text-accent">
                    <eco.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-neutral-500 uppercase tracking-wider">
                    {eco.title}
                  </span>
                </div>
                
                <div className="mb-3">
                  <div className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                    {eco.bigNumber}
                  </div>
                  <div className="text-xs text-accent font-medium mt-0.5">
                    {eco.subText}
                  </div>
                </div>

                <p className="text-xs md:text-sm text-neutral-500 leading-relaxed font-medium">
                  {eco.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Extensions Marketplace Callout Banner */}
        <motion.div
          className="bg-neutral-900 dark:bg-neutral-950 text-white rounded-4xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6 border border-neutral-800"
          variants={item}
          whileHover={{ scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-3xl bg-accent flex items-center justify-center text-black shrink-0">
              <Store className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-2xl md:text-3xl font-medium tracking-tight mb-1 text-white">
                Extensions Marketplace
              </h3>
              <p className="text-neutral-400 text-sm md:text-base max-w-xl">
                Browse and install community plugins, themes, and MCP tools directly from the mcode CLI or Web IDE.
              </p>
            </div>
          </div>
          <motion.a
            href="/extensions"
            className="group relative cursor-pointer inline-flex items-center shrink-0"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="absolute right-0 inset-y-0 w-[calc(100%-2rem)] rounded-xl bg-accent"></span>
            <motion.span
              className="relative z-10 px-6 py-3 rounded-xl bg-white text-black font-medium text-sm"
              whileHover={{ boxShadow: '0 0 20px rgba(74, 222, 128, 0.5)' }}
            >
              Explore Extensions
            </motion.span>
            <motion.span
              className="relative -left-px z-10 w-11 h-11 rounded-xl flex items-center justify-center text-black"
              whileHover={{ rotate: -45 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <ArrowUpRight className="w-4 h-4" />
            </motion.span>
          </motion.a>
        </motion.div>
      </motion.div>
    </section>
  );
}
