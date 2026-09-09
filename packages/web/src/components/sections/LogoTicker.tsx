import React from 'react';
import { motion } from 'framer-motion';

const logos = ['Acme Corp', 'Altshift', 'Biosynthesis', 'Boltshift', 'Capsule', 'Catalog'];

export function LogoTicker() {
  return (
    <motion.div
      className="pt-24 pb-12 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      <motion.div
        className="flex justify-center px-6"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
      >
        <motion.div
          className="relative max-w-5xl w-full mask-linear-gradient"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
        >
          <motion.div
            className="flex w-max opacity-50"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 0.5, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div
              className="flex gap-12 text-2xl font-bold uppercase tracking-widest text-neutral-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.08, delayChildren: 0.25 }}
            >
              {logos.map((logo, i) => (
                <motion.span
                  key={logo}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.08, duration: 0.4 }}
                  whileHover={{ scale: 1.05 }}
                >
                  {logo}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
