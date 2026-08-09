import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowUpRight, ArrowDown } from 'lucide-react';
import robotVideo from '../../assets/robot-video.mp4';

const textVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 0.1 + i * 0.15 }
  })
};

export function AgentFeature() {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);

  // Parallax: map vertical scroll progress of the section to video scale/y
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start bottom', 'bottom top']
  });
  const videoScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.1, 1.05, 1]);
  const videoY = useTransform(scrollYProgress, [0, 1], [100, 0]);

  return (
    <motion.section
      ref={sectionRef}
      className="relative w-full min-h-screen flex flex-col justify-between overflow-hidden bg-[#e8f1f5] rounded-3xl my-8 mx-auto max-w-[98%] border border-black/5"
      style={{ colorScheme: 'light' }}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20% 0px' }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Robot Video Background (parallax via scroll) */}
      <div className="absolute inset-0 z-0">
        <motion.video
          ref={videoRef}
          src={robotVideo}
          className="w-full h-full object-cover object-bottom opacity-95"
          autoPlay
          loop
          muted
          playsInline
          style={{
            scale: videoScale,
            y: videoY,
            transformOrigin: 'bottom center'
          }}
        />
      </div>

      {/* Overlay Content */}
      <div className="relative z-10 w-full px-6 md:px-10 lg:px-12 pt-20 md:pt-32 pb-12 flex flex-col min-h-screen">
        {/* Top Huge Heading */}
        <motion.div
          className="relative z-10 max-w-[90%] md:max-w-xl lg:max-w-3xl"
          custom={0}
          variants={textVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.h2
            className="text-4xl md:text-5xl lg:text-[3.8rem] tracking-tight font-serif text-black leading-[1.15]"
            custom={0}
            variants={textVariants}
          >
            Your intelligent AI-agent<br />
            that understands your entire<br />
            codebase{' '}
            <motion.span
              className="text-[#F95A2C]"
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 300, delay: 0.15 }}
            >
              {'</>'}
            </motion.span>
          </motion.h2>
        </motion.div>

        {/* Bottom Elements (Left & Right columns) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mt-auto pt-64 gap-8 pb-12 md:pb-0">
          {/* Left Content */}
          <motion.div
            className="max-w-sm"
            custom={1}
            variants={textVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.p className="font-medium text-lg mb-6 text-black" custom={1} variants={textVariants}>
              Start with mcode Today<br />
              and Make Coding Effortless!
            </motion.p>
            <motion.button
              className="group flex items-center gap-2 bg-black hover:bg-neutral-800 transition-colors text-white px-6 py-3 rounded-full font-medium text-sm"
              custom={2}
              variants={textVariants}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Get started
              <motion.span
                className="bg-white text-black p-1 rounded-full flex items-center justify-center"
                whileHover={{ rotate: 45 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
              </motion.span>
            </motion.button>
          </motion.div>

          {/* Right Content */}
          <motion.div
            className="max-w-sm md:text-right pr-4 md:pr-24"
            custom={2}
            variants={textVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.p className="text-black text-lg" custom={3} variants={textVariants}>
              <strong className="font-medium text-xl">Build / Debug / Review</strong><br />
              any code and turn your ideas directly into real products.
            </motion.p>
          </motion.div>
        </div>
      </div>

      {/* Rotating Badge — infinite rotation via Framer Motion */}
      <div className="absolute bottom-8 right-8 md:bottom-16 md:right-16 z-20 hidden md:flex items-center justify-center w-32 h-32">
        <motion.div
          className="absolute inset-0 origin-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full text-black overflow-visible">
            <path id="circlePath" d="M 50, 50 m -35, 0 a 35,35 0 1,1 70,0 a 35,35 0 1,1 -70,0" fill="transparent" />
            <text className="text-[14px] font-medium uppercase tracking-[0.2em]">
              <textPath href="#circlePath" startOffset="0%">
                Scroll Down • Scroll Down •
              </textPath>
            </text>
          </svg>
        </motion.div>
        <motion.div
          className="relative z-10"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ArrowDown className="w-6 h-6 text-black" />
        </motion.div>
      </div>
    </motion.section>
  );
}
