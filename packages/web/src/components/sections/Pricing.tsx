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

export function Pricing() {
  return (
    <section id="pricing" className="w-full bg-background px-6 py-20 sm:py-28 scroll-mt-24">
      <motion.div
        className="mx-auto max-w-5xl"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        variants={container}
      >
        <motion.div
          className="mb-12 text-center sm:mb-16"
          variants={item}
        >
          <motion.span
            className="text-sm font-medium text-muted-foreground"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Pricing
          </motion.span>
          <motion.h2
            className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Simple, transparent pricing
          </motion.h2>
          <motion.p
            className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
          >
            Choose the plan that works best for your team. All plans include a 14-day free trial.
          </motion.p>
        </motion.div>
        <motion.div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8"
          variants={container}
        >
          {/* Starter Plan */}
          <motion.div
            className="relative flex h-full flex-col rounded-2xl bg-frame p-6 sm:p-8 border border-border"
            variants={item}
            whileHover={{ scale: 1.03, y: -5, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <motion.h3
              className="text-xl font-semibold text-foreground"
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              Starter
            </motion.h3>
            <motion.div
              className="mt-4"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-end gap-3">
                <motion.span
                  className="text-5xl font-bold tracking-tight text-foreground"
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 300 }}
                >
                  $24
                </motion.span>
                <span className="mb-1 text-sm text-muted-foreground">/month</span>
              </div>
            </motion.div>
            <motion.button
              className="mt-6 w-full rounded-xl py-3 text-sm font-semibold bg-muted text-foreground hover:bg-muted/80"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Get Started
            </motion.button>
          </motion.div>

          {/* Premium Plan */}
          <motion.div
            className="relative flex h-full flex-col rounded-2xl bg-frame p-6 sm:p-8 border-2 border-accent"
            variants={item}
            whileHover={{ scale: 1.03, y: -5, boxShadow: '0 25px 50px rgba(74, 222, 128, 0.15)' }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <motion.div
              className="absolute -top-4 left-1/2 -translate-x-1/2"
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <span className="inline-block rounded-full bg-accent px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-black/50">Most Popular</span>
            </motion.div>
            <motion.h3
              className="text-xl font-semibold text-foreground"
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              Premium
            </motion.h3>
            <motion.div
              className="mt-4"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-end gap-3">
                <motion.span
                  className="text-5xl font-bold tracking-tight text-foreground"
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 300 }}
                >
                  $99
                </motion.span>
                <span className="mb-1 text-sm text-muted-foreground">/month</span>
              </div>
            </motion.div>
            <motion.button
              className="mt-6 w-full rounded-xl py-3 text-sm font-semibold bg-accent text-black hover:bg-accent/90"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Get Started
            </motion.button>
          </motion.div>

          {/* Enterprise Plan */}
          <motion.div
            className="relative flex h-full flex-col rounded-2xl bg-frame p-6 sm:p-8 border border-border"
            variants={item}
            whileHover={{ scale: 1.03, y: -5, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <motion.h3
              className="text-xl font-semibold text-foreground"
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              Enterprise
            </motion.h3>
            <motion.div
              className="mt-4"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-end gap-3">
                <motion.span
                  className="text-5xl font-bold tracking-tight text-foreground"
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 300 }}
                >
                  Custom
                </motion.span>
              </div>
            </motion.div>
            <motion.button
              className="mt-6 w-full rounded-xl py-3 text-sm font-semibold bg-muted text-foreground hover:bg-muted/80"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Contact Sales
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
