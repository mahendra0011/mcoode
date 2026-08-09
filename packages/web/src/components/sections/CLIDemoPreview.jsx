import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';

const demoLines = [
  { text: "$ mcode create next-app", delay: 500, color: "text-green-500" },
  { text: "?  Creating a new mcode app in ./next-app", delay: 1000, color: "text-blue-400" },
  { text: "?  Installing dependencies using npm...", delay: 2500, color: "text-blue-400" },
  { text: "added 342 packages in 2s", delay: 2600, color: "text-gray-400" },
  { text: "?  Initializing git repository", delay: 3000, color: "text-blue-400" },
  { text: "Success! Created next-app at ~/projects/next-app", delay: 3200, color: "text-green-400" },
  { text: "Inside that directory, you can run several commands:", delay: 3300, color: "text-gray-300" },
  { text: "  npm run dev", delay: 3400, color: "text-white" },
  { text: "    Starts the development server.", delay: 3450, color: "text-gray-500" },
  { text: "  npm run build", delay: 3500, color: "text-white" },
  { text: "    Builds the app for production.", delay: 3550, color: "text-gray-500" },
  { text: "We suggest that you begin by typing:", delay: 4000, color: "text-gray-300" },
  { text: "  cd next-app", delay: 4200, color: "text-cyan-400" },
  { text: "  npm run dev", delay: 4400, color: "text-cyan-400" },
];

export function CLIDemoPreview() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: '-20% 0px' });
  const [visibleLines, setVisibleLines] = useState([]);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (isInView) {
      setHasStarted(true);
    }
  }, [isInView]);

  useEffect(() => {
    if (!hasStarted) return;

    let timeouts = [];
    demoLines.forEach((line) => {
      const timeout = setTimeout(() => {
        setVisibleLines((prev) => [...prev, line]);
      }, line.delay);
      timeouts.push(timeout);
    });

    return () => timeouts.forEach(clearTimeout);
  }, [hasStarted]);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className="relative px-6 mt-16 max-[850px]:mt-10 mb-32 z-10"
    >
      <motion.div
        className="relative max-w-4xl mx-auto"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.1 }}
      >
        <motion.div
          className="relative bg-zinc-950/90 backdrop-blur-2xl rounded-2xl overflow-hidden border border-green-500/20 shadow-[0_30px_100px_rgba(0,255,100,0.15)] flex flex-col min-h-[450px]"
          whileHover={{ scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          {/* Terminal Header */}
          <motion.div
            className="flex items-center px-4 py-3 border-b border-green-500/10 bg-zinc-900/80"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <motion.div className="flex gap-2">
              <motion.div
                className="w-3.5 h-3.5 rounded-full bg-red-500/80 border border-red-500/20"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
              />
              <motion.div
                className="w-3.5 h-3.5 rounded-full bg-yellow-500/80 border border-yellow-500/20"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.12, type: 'spring', stiffness: 300 }}
              />
              <motion.div
                className="w-3.5 h-3.5 rounded-full bg-green-500/80 border border-green-500/20"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.14, type: 'spring', stiffness: 300 }}
              />
            </motion.div>
            <motion.div
              className="mx-auto text-xs font-mono text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              bash - mcode
            </motion.div>
          </motion.div>

          {/* Terminal Body with Animated Lines */}
          <div className="p-6 font-mono text-[14px] leading-relaxed space-y-2 flex-1">
            <AnimatePresence>
              {visibleLines.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  className={line.color}
                >
                  {line.text.startsWith('$') ? (
                    <span className="font-semibold">{line.text}</span>
                  ) : line.text.startsWith('  ') ? (
                    <span className="ml-4">{line.text}</span>
                  ) : (
                    <span>{line.text}</span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Blinking Cursor */}
            {hasStarted && (
              <motion.div
                className="mt-2 flex items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {visibleLines.length === demoLines.length && (
                  <motion.span
                    className="text-green-500 mr-2"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    $
                  </motion.span>
                )}
                <motion.span
                  className="w-2.5 h-5 bg-white/80 inline-block align-middle"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
                />
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
