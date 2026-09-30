import React from 'react';
import { motion } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] } }
};

export function FeaturesGrid() {
  return (
    <section className="w-full px-6 mb-32 bg-background">
      <motion.div
        className="max-w-5xl mx-auto"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        variants={container}
      >
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-4">
          <motion.div
            className="group bg-neutral-100 dark:bg-neutral-900 rounded-4xl p-8 overflow-hidden min-h-[400px] md:row-span-2 flex flex-col justify-between"
            variants={item}
            whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <div>
              <motion.span
                className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-accent/20 text-accent mb-4"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
              >
                Core Engine
              </motion.span>
              <motion.h3
                className="text-2xl md:text-4xl font-medium text-neutral-900 dark:text-neutral-100 leading-tight mb-3"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
              >
                God Mode
              </motion.h3>
              <motion.p
                className="text-neutral-500 text-sm md:text-base leading-relaxed"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 }}
              >
                Describe a task in plain English. mcode plans it, dispatches parallel subagents, and integrates the result — with a shared undo stack and a hard 25-turn safety cap.
              </motion.p>
            </div>
          </motion.div>

          <motion.div
            className="group bg-neutral-50 dark:bg-neutral-800 rounded-4xl p-8 overflow-hidden min-h-[220px]"
            variants={item}
            whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <motion.h3
              className="text-xl md:text-2xl font-medium text-neutral-900 dark:text-neutral-100 mb-3"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              7 Model Providers, One Interface
            </motion.h3>
            <motion.p
              className="text-neutral-500 text-sm md:text-base leading-relaxed"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05 }}
            >
              Route between OpenRouter, Anthropic, OpenAI, Gemini, Groq, Ollama, and LM Studio. Automatic fallback when a provider rate-limits you.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <motion.div
              className="group bg-neutral-50 dark:bg-neutral-800 rounded-4xl p-6 md:p-8 flex flex-col justify-between min-h-[250px]"
              variants={item}
              whileHover={{ scale: 1.03, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <div>
                <motion.h3
                  className="text-xl md:text-2xl font-medium text-neutral-900 dark:text-neutral-100 mb-3"
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                >
                  Watch Daemon
                </motion.h3>
                <motion.p
                  className="text-neutral-500 text-sm leading-relaxed"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 }}
                >
                  Background file-watching with automatic lint checks, static import validation, and an AI bugfix agent that finds related tests before it touches your code.
                </motion.p>
              </div>
            </motion.div>

            <motion.div
              className="group bg-neutral-100 dark:bg-neutral-900 rounded-4xl p-6 md:p-8 flex flex-col justify-between min-h-[250px]"
              variants={item}
              whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <div>
                <motion.h3
                  className="text-xl md:text-2xl font-medium text-neutral-900 dark:text-neutral-100 mb-3"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  Encrypted Vault
                </motion.h3>
                <motion.p
                  className="text-neutral-500 text-sm leading-relaxed"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.05 }}
                >
                  API keys stored locally with AES-256-GCM encryption. <code className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-xs font-mono">--plain</code> mode available for CI pipelines.
                </motion.p>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
