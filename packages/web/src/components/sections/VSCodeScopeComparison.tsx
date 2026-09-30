import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock } from 'lucide-react';

const canDo = [
  'Chat with the AI agent directly inside VS Code sidebar',
  'Apply proposed file edits directly to open workspace files',
  'Execute shell & terminal commands via integrated terminal',
  'Switch model providers (OpenRouter, OpenAI, Anthropic, Gemini) mid-conversation'
];

const notYet = [
  'Full God Mode parallel-subagent orchestration inside extension (planned on roadmap)'
];

export function VSCodeScopeComparison() {
  return (
    <section className="w-full px-6 py-20 bg-background">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <motion.h2
            className="text-4xl md:text-5xl font-medium tracking-tight text-neutral-900 dark:text-neutral-100 mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Extension Capability <span className="italic font-serif text-accent">Scope & Roadmap</span>
          </motion.h2>
          <motion.p
            className="text-lg text-neutral-500 max-w-xl mx-auto font-medium"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Honest breakdown of features available today versus what is currently in active development.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Can Do Column */}
          <motion.div
            className="bg-neutral-100 dark:bg-neutral-900 rounded-4xl p-8 border border-neutral-200/60 dark:border-neutral-800/60 flex flex-col justify-between"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-500 font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-2xl font-medium text-neutral-900 dark:text-neutral-100">
                    Available Now
                  </h3>
                  <p className="text-xs text-emerald-500 font-semibold uppercase tracking-wider">
                    Full Support
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {canDo.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 leading-relaxed">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Not Yet Column */}
          <motion.div
            className="bg-neutral-50 dark:bg-neutral-950 rounded-4xl p-8 border border-neutral-200/60 dark:border-neutral-800/60 flex flex-col justify-between"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-500 font-bold">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-2xl font-medium text-neutral-900 dark:text-neutral-100">
                    Coming Soon
                  </h3>
                  <p className="text-xs text-amber-500 font-semibold uppercase tracking-wider">
                    Extension Roadmap
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {notYet.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-500 uppercase shrink-0 mt-0.5">
                      Roadmap
                    </span>
                    <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 font-medium">
              Note: Full God Mode subagent swarms are accessible today via the mcode CLI (<code className="font-mono text-accent">mcode god</code>) and Web IDE.
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
