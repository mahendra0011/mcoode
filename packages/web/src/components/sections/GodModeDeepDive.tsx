import React from 'react';
import { motion } from 'framer-motion';
import { GitFork, Cpu, ShieldCheck, ArrowRight } from 'lucide-react';

const stages = [
  {
    num: '01',
    icon: GitFork,
    title: 'Plan',
    subtitle: 'Task DAG Generation',
    desc: 'A planning agent reads your natural-language task and produces a todo DAG — a dependency graph, not just a flat list, so independent work can run in parallel.'
  },
  {
    num: '02',
    icon: Cpu,
    title: 'Dispatch',
    subtitle: 'Parallel Subagent Swarms',
    desc: 'Subagents run concurrently with access to read_file, write_file, run, and git diff tools, coordinated through a shared undo stack.'
  },
  {
    num: '03',
    icon: ShieldCheck,
    title: 'Integrate',
    subtitle: 'Verification & Safety Cap',
    desc: 'Results merge back, an integration pass runs your test suite, and the whole task is capped at 25 turns as a hard safety limit.'
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2, delayChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } }
};

export function GodModeDeepDive() {
  return (
    <section className="w-full px-6 py-24 bg-background border-t border-b border-neutral-200/40 dark:border-neutral-800/40">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <motion.span
            className="inline-block px-3.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-accent/20 text-accent mb-4"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            Autonomous Execution Engine
          </motion.span>
          <motion.h2
            className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight text-neutral-900 dark:text-neutral-100 mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Inside <span className="italic font-serif text-accent">God Mode</span> Architecture
          </motion.h2>
          <motion.p
            className="text-lg text-neutral-500 max-w-2xl mx-auto font-medium"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            How mcode takes a high-level task and turns it into verified code across 3 coordinated execution stages.
          </motion.p>
        </div>

        {/* 3-Stage Connected Horizontal Flow */}
        <motion.div
          className="relative grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {stages.map((stage, idx) => {
            const Icon = stage.icon;
            return (
              <motion.div
                key={stage.title}
                className="group relative bg-neutral-100 dark:bg-neutral-900 rounded-4xl p-8 flex flex-col justify-between min-h-[320px] border border-neutral-200/60 dark:border-neutral-800/60"
                variants={itemVariants}
                whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-black font-bold">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-3xl font-mono font-bold text-neutral-300 dark:text-neutral-700">
                      {stage.num}
                    </span>
                  </div>

                  <h3 className="text-2xl font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                    {stage.title}
                  </h3>
                  <p className="text-xs font-semibold uppercase tracking-wider text-accent mb-4">
                    {stage.subtitle}
                  </p>
                  <p className="text-sm text-neutral-500 leading-relaxed">
                    {stage.desc}
                  </p>
                </div>

                {/* Arrow Connector for Desktop (between cards 1->2 and 2->3) */}
                {idx < stages.length - 1 && (
                  <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-accent text-black items-center justify-center shadow-md">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
