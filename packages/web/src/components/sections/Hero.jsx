import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDownRight } from 'lucide-react';

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

export function Hero() {
  return (
    <section className="flex flex-col relative" style={{ colorScheme: 'light' }}>
      <motion.div
        className="flex items-start justify-center px-6 pt-64 max-[850px]:pt-32 relative z-10"
        initial="hidden"
        animate="visible"
        variants={heroContainer}
      >
        <motion.div
          className="flex flex-col items-center max-[850px]:items-start text-center max-[850px]:text-left max-w-4xl max-[850px]:w-full"
          variants={heroContainer}
        >
          <motion.div className="inline-flex items-center gap-1.5 pl-4 pr-3 py-1.5 rounded-xl border border-black/10 bg-white text-black text-sm font-medium mb-6" variants={heroItem}>
            Now Available <motion.span className="text-accent" variants={heroItem}>✦</motion.span>
          </motion.div>

          <motion.h1 className="text-8xl max-[850px]:text-5xl font-medium tracking-tight leading-[1.1] mb-6 text-black" variants={heroContainer}>
            <motion.span className="block" variants={heroItem}>Build Faster</motion.span>
            <motion.span className="block" variants={heroItem}>
              Ship with <span className="italic font-serif text-accent">Confidence</span>
            </motion.span>
          </motion.h1>

          <motion.p className="text-lg text-neutral-800 font-medium mb-8" variants={heroItem}>
            The modern platform for teams who want to move fast without breaking things
          </motion.p>

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
              Get Started
            </motion.span>
            <motion.span
              className="relative -left-px z-10 w-11 h-11 rounded-xl flex items-center justify-center text-black"
              whileHover={{ rotate: -45 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <ArrowDownRight className="w-5 h-5" />
            </motion.span>
          </motion.button>
        </motion.div>
      </motion.div>
    </section>
  );
}
