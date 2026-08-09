import React from 'react';
import { motion } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] } }
};

const avatarVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: (i) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.35, delay: i * 0.1 + 0.1, type: 'spring', stiffness: 300 }
  })
};

export function Testimonials() {
  const avatars = [
    { className: 'bg-accent' },
    { className: 'bg-neutral-200' },
    { className: 'bg-neutral-200' }
  ];

  return (
    <motion.section
      className="w-full bg-frame border-t border-b border-accent/15 px-6 py-32"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      variants={container}
    >
      <div className="mx-auto max-w-5xl">
        <motion.h2
          className="mb-16 text-4xl leading-tight font-medium text-neutral-900 sm:text-5xl lg:mb-20 lg:text-6xl dark:text-neutral-50"
          variants={item}
        >
          Trusted by teams worldwide
        </motion.h2>
        <motion.div
          className="mb-16 grid gap-8 lg:mb-20 lg:grid-cols-2 lg:gap-12"
          variants={container}
        >
          <motion.div
            className="flex items-center justify-start gap-4 lg:gap-6"
            variants={item}
          >
            {avatars.map((a, i) => (
              <motion.div
                key={i}
                custom={i}
                variants={avatarVariants}
                className={`relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full ${a.className}`}
                whileHover={{ scale: 1.1, rotate: i * 20 }}
                transition={{ type: 'spring', stiffness: 300 }}
              />
            ))}
          </motion.div>
          <motion.div
            className="flex flex-col justify-center"
            variants={item}
          >
            <motion.blockquote
              className="mb-6 text-xl leading-relaxed text-neutral-700 dark:text-neutral-300"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.25 }}
            >
              "This platform completely transformed how our support team operates. Response times dropped by 60% and customer satisfaction is at an all-time high."
            </motion.blockquote>
            <motion.div
              className="text-base font-medium text-neutral-900 sm:text-lg dark:text-neutral-100"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              Jennifer Walsh,{' '}
              <span className="text-neutral-500">VP of Customer Success @ Commandr</span>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
}
