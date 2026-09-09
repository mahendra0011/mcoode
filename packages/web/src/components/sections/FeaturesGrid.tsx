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
            className="group bg-neutral-100 dark:bg-neutral-900 rounded-4xl p-8 overflow-hidden min-h-[400px] md:row-span-2 flex flex-col"
            variants={item}
            whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <motion.h3
              className="text-2xl md:text-4xl font-medium text-neutral-900 dark:text-neutral-100 leading-tight mb-3"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              Guided Onboarding For Every Team
            </motion.h3>
            <motion.p
              className="text-neutral-500 text-sm"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
            >
              Get your team up and running in minutes with step-by-step walkthroughs
            </motion.p>
          </motion.div>

          <motion.div
            className="group bg-neutral-50 dark:bg-neutral-800 rounded-4xl p-8 overflow-hidden min-h-[300px]"
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
              Real-time Data
            </motion.h3>
            <motion.p
              className="text-neutral-500 text-sm"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05 }}
            >
              Monitor metrics, analytics, and team activity instantly
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <motion.div
              className="group bg-neutral-50 dark:bg-neutral-800 rounded-4xl p-6 md:p-8 flex flex-col items-center justify-center text-center min-h-[250px]"
              variants={item}
              whileHover={{ scale: 1.03, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <motion.h3
                className="text-2xl md:text-3xl font-medium text-neutral-900 dark:text-neutral-100 mb-1"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
              >
                Trusted By
              </motion.h3>
              <motion.h3
                className="text-2xl md:text-3xl font-medium text-neutral-900 dark:text-neutral-100 mb-5"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 300 }}
              >
                254k+ Users
              </motion.h3>
            </motion.div>

            <motion.div
              className="group bg-neutral-100 dark:bg-neutral-900 rounded-4xl p-6 md:p-8 flex flex-col min-h-[250px]"
              variants={item}
              whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <motion.h3
                className="text-xl md:text-2xl font-medium text-neutral-900 dark:text-neutral-100 mb-2"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                Built to Scale
              </motion.h3>
              <motion.p
                className="text-neutral-500 text-sm"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.05 }}
              >
                Enterprise-ready infrastructure that grows with you
              </motion.p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
