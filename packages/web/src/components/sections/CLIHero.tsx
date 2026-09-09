import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownRight, Copy, Check } from 'lucide-react';

const heroContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const heroItem = {
  hidden: { opacity: 0, y: 40, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
  }
};

export function CLIHero() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('npm i -g mcode-cli');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.section
      className="flex flex-col relative"
      style={{ colorScheme: 'light' }}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className="flex items-start justify-center px-6 pt-64 max-[850px]:pt-32 relative z-10"
        variants={heroContainer}
      >
        <motion.div
          className="flex flex-col items-center max-[850px]:items-start text-center max-[850px]:text-left max-w-4xl max-[850px]:w-full"
          variants={heroContainer}
        >
          <motion.div
            className="inline-flex items-center gap-1.5 pl-4 pr-3 py-1.5 rounded-xl border border-black/10 bg-white text-black text-sm font-medium mb-6"
            variants={heroItem}
          >
            MCode CLI <motion.span className="text-accent" variants={heroItem}>✦</motion.span>
          </motion.div>

          <motion.h1 className="text-8xl max-[850px]:text-5xl font-medium tracking-tight leading-[1.1] mb-6 text-black" variants={heroContainer}>
            <motion.span className="block text-white" variants={heroItem}>Ship code without</motion.span>
            <motion.span className="block text-white" variants={heroItem}>
              leaving your{' '}
              <motion.span
                className="italic font-serif text-green-500 bg-white px-3 py-1 rounded-xl"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
              >
                terminal
              </motion.span>
            </motion.span>
          </motion.h1>

          <motion.p className="text-lg text-white font-medium mb-8" variants={heroItem}>
            mcode is a terminal-first, multi-model AI coding CLI. Bring your own model keys,
            split work into parallel subagents, and let a background daemon keep your project
            fixed while you sleep.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full"
            variants={heroContainer}
          >
            <motion.button
              type="button"
              className="group relative cursor-pointer inline-flex items-center max-[850px]:w-full"
              variants={heroItem}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="absolute right-0 inset-y-0 w-[calc(100%-2rem)] max-[850px]:w-full rounded-xl bg-accent"></span>
              <motion.span
                className="relative z-10 px-6 py-3 rounded-xl bg-black text-white font-medium max-[850px]:flex-1"
                whileHover={{ boxShadow: '0 0 20px rgba(74, 222, 128, 0.5)' }}
              >
                Browse commands
              </motion.span>
              <motion.span
                className="relative -left-px z-10 w-11 h-11 rounded-xl flex items-center justify-center text-black"
                whileHover={{ rotate: -45 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <ArrowDownRight className="w-5 h-5" />
              </motion.span>
            </motion.button>

            <motion.div
              className="flex items-center gap-3 bg-white/80 backdrop-blur-md border border-black/10 rounded-xl p-2 pl-6 shadow-sm w-full sm:w-auto h-[46px]"
              variants={heroItem}
              whileHover={{ scale: 1.03 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <code className="text-sm font-mono text-black font-semibold">npm i -g mcode-cli</code>
              <motion.button
                onClick={handleCopy}
                className="p-1.5 hover:bg-black/5 rounded-lg transition-colors text-neutral-600 hover:text-black"
                title="Copy command"
                whileTap={{ scale: 0.85 }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {copied ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 90 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <Check className="w-4 h-4 text-green-600" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="copy"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <Copy className="w-4 h-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.section>
  );
}
