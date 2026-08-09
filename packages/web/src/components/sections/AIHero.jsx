import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDownRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const MotionLink = motion.create(Link);

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

export function AIHero() {
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
          <motion.div
            className="inline-flex items-center gap-1.5 pl-4 pr-3 py-1.5 rounded-xl border border-black/10 bg-[#E5F5E9] text-black text-sm font-medium mb-6"
            variants={heroItem}
          >
            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
            </motion.div>
            MCode AI Agent{' '}
            <motion.span
              className="text-emerald-600"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, delay: 0.25 }}
            >
              ✦
            </motion.span>
          </motion.div>

          <motion.h1 className="text-8xl max-[850px]:text-5xl font-medium tracking-tight leading-[1.1] mb-6 text-black" variants={heroContainer}>
            <motion.span className="block text-black" variants={heroItem}>Code at the speed of</motion.span>
            <motion.span className="block italic font-serif text-emerald-600" variants={heroItem}>
              Thought
            </motion.span>
          </motion.h1>

          <motion.p className="text-lg text-neutral-800 font-medium mb-8" variants={heroItem}>
            Meet your new pair programmer. Describe what you want to build, and watch MCode AI generate production-ready code, fix bugs, and refactor architecture instantly.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full"
            variants={heroContainer}
          >
            <MotionLink
              to="/ai/chat"
              className="group relative cursor-pointer inline-flex items-center max-[850px]:w-full"
              variants={heroItem}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="absolute right-0 inset-y-0 w-[calc(100%-2rem)] max-[850px]:w-full rounded-xl bg-emerald-500"></span>
              <motion.span
                className="relative z-10 px-6 py-3 rounded-xl bg-black text-white font-medium max-[850px]:flex-1 text-center"
                whileHover={{ boxShadow: '0 0 20px rgba(74, 222, 128, 0.5)' }}
              >
                Chat with AI
              </motion.span>
              <motion.span
                className="relative -left-px z-10 w-11 h-11 rounded-xl flex items-center justify-center text-black"
                whileHover={{ rotate: -45 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <ArrowDownRight className="w-5 h-5" />
              </motion.span>
            </MotionLink>

            <motion.button
              type="button"
              className="px-6 py-3 rounded-xl bg-white/80 backdrop-blur-md border border-black/10 text-black font-semibold shadow-sm hover:bg-black/5 transition-colors w-full sm:w-auto"
              variants={heroItem}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Explore Features
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
