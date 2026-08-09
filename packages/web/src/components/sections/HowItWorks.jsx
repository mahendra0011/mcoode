import React from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck, Users, Rocket } from 'lucide-react';

const steps = [
  { icon: CalendarCheck, title: 'Schedule kickoff', desc: 'Align on scope, structure, and timeline. Whether it\'s a quick setup or a full migration, we\'ll take it from there.' },
  { icon: Users, title: 'Real-time collaboration', desc: 'Work alongside our team with full visibility. Every step follows best practices and thorough QA to ensure quality.' },
  { icon: Rocket, title: 'Launch and scale', desc: 'Go live with confidence. Our AI continuously learns and improves, helping your team scale effortlessly.' }
];

export function HowItWorks() {
  return (
    <section className="relative w-full bg-background">
      <div className="mx-auto grid max-w-5xl gap-12 px-6 py-20 sm:py-28 lg:grid-cols-2 lg:gap-20">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="lg:sticky lg:top-48 lg:h-fit lg:self-start"
        >
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
          >
            How it works
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="mt-6 max-w-md text-lg leading-relaxed text-foreground/60"
          >
            Your platform, configured by experts and launched on an{' '}
            <span className="font-medium text-foreground">Enterprise plan</span>, ready to grow with you.
          </motion.p>
          <motion.a
            href="#"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-8 inline-flex items-center rounded-xl bg-foreground px-6 py-3 text-sm font-semibold text-background hover:bg-foreground/90"
            whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(74, 222, 128, 0.3)' }}
            whileTap={{ scale: 0.98 }}
          >
            Schedule kickoff
          </motion.a>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative"
        >
          <motion.div
            className="absolute left-6 top-6 h-[calc(100%-6rem)] w-0.5 -translate-x-1/2 bg-foreground/10"
            initial={{ height: 0 }}
            whileInView={{ height: 'calc(100% - 6rem)' }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <motion.div
              className="w-full bg-accent"
              initial={{ height: 0 }}
              whileInView={{ height: '50%' }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            />
          </motion.div>
          <motion.ol
            className="relative list-none p-0 m-0"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.2 } }
            }}
          >
            {steps.map((step, i) => (
              <motion.li
                key={step.title}
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              >
                <motion.div className="relative flex gap-5" style={{ paddingBottom: i < steps.length - 1 ? '2rem' : 0 }}>
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: 'spring', stiffness: 300, delay: 0.2 + i * 0.12 }}
                    className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent"
                    whileHover={{ rotate: 360 }}
                  >
                    <motion.div
                      initial={{ rotate: -90, opacity: 0 }}
                      whileInView={{ rotate: 0, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.25 + i * 0.12 }}
                    >
                      <step.icon className="h-5 w-5 text-black" />
                    </motion.div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.25 + i * 0.12 }}
                    className="pt-1"
                  >
                    <h3 className="text-xl font-semibold text-foreground sm:text-2xl">{step.title}</h3>
                    <p className="mt-2 max-w-sm text-base leading-relaxed text-foreground/60">{step.desc}</p>
                  </motion.div>
                </motion.div>
              </motion.li>
            ))}
          </motion.ol>
        </motion.div>
      </div>
    </section>
  );
}
