import React from 'react';
import { motion } from 'framer-motion';

export function AIChatPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20% 0px 0px' }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className="relative px-6 mt-24 max-[850px]:mt-10 mb-32 z-10"
    >
      <motion.div
        className="relative max-w-5xl mx-auto"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
      >
        <motion.div
          className="relative bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-200 shadow-2xl/5 mask-linear-gradient flex items-center justify-center min-h-[400px]"
          whileHover={{ scale: 1.02, boxShadow: '0 40px 80px rgba(0,0,0,0.4)' }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <motion.span
            className="text-white text-xl font-medium opacity-50"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.5 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            AI Chat Interface Preview Image
          </motion.span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
