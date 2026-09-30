import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDownRight, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * Installer path for the desktop build. The `.exe` is a static file published
 * into public/downloads by `npm run publish:ide`, so the URL stays stable
 * across version bumps.
 */
const DOWNLOAD_URL = '/downloads/mcode-setup.exe';
const INSTALLER_SIZE_MB = 107;

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

export function IDEHero() {
  const router = useRouter();

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
            mcode Web & Desktop IDE <motion.span className="text-accent" variants={heroItem}>✦</motion.span>
          </motion.div>

          <motion.h1 className="text-8xl max-[850px]:text-5xl font-medium tracking-tight leading-[1.1] mb-6 text-black" variants={heroContainer}>
            <motion.span className="block" variants={heroItem}>A Code Editor That</motion.span>
            <motion.span className="block" variants={heroItem}>
              <span className="italic font-serif text-accent">Writes Code With You</span>
            </motion.span>
          </motion.h1>

          <motion.p className="text-lg text-neutral-800 font-medium mb-8 max-w-2xl" variants={heroItem}>
            Full file explorer, integrated terminal, source control, and an AI agent — in one window. No plugins to install.
          </motion.p>

          <motion.button
            type="button"
            onClick={() => router.push('/ai/chat')}
            className="group relative cursor-pointer inline-flex items-center max-[850px]:w-full"
            variants={heroItem}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="absolute right-0 inset-y-0 w-[calc(100%-2rem)] max-[850px]:w-full rounded-xl bg-accent"></span>
            <motion.span
              className="relative z-10 px-6 py-3 rounded-xl bg-black text-white font-medium max-[850px]:flex-1 text-sm"
              whileHover={{ boxShadow: '0 0 20px rgba(74, 222, 128, 0.5)' }}
            >
              Launch Web IDE
            </motion.span>
            <motion.span
              className="relative -left-px z-10 w-11 h-11 rounded-xl flex items-center justify-center text-black"
              whileHover={{ rotate: -45 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <ArrowDownRight className="w-5 h-5" />
            </motion.span>
          </motion.button>

          {/* The desktop app is a separate download from the web IDE above:
              /ai/chat runs in the browser, this installs the Windows .exe.
              File is published by `npm run publish:ide`. */}
          <motion.a
            href={DOWNLOAD_URL}
            download
            className="group relative cursor-pointer inline-flex items-center mt-3 max-[850px]:w-full"
            variants={heroItem}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="absolute right-0 inset-y-0 w-[calc(100%-2rem)] max-[850px]:w-full rounded-xl bg-transparent border border-black/15"></span>
            <motion.span
              className="relative z-10 px-6 py-3 rounded-xl bg-transparent text-black font-medium max-[850px]:flex-1 text-sm"
              whileHover={{ boxShadow: '0 0 20px rgba(74, 222, 128, 0.35)' }}
            >
              Download Now
            </motion.span>
            <motion.span
              className="relative -left-px z-10 w-11 h-11 rounded-xl flex items-center justify-center text-black"
              whileHover={{ rotate: -45 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Download className="w-5 h-5" />
            </motion.span>
          </motion.a>

          <motion.p
            className="mt-3 text-xs text-neutral-500"
            variants={heroItem}
          >
            Windows · {INSTALLER_SIZE_MB} MB · runs locally against your Docker stack
          </motion.p>
        </motion.div>
      </motion.div>
    </section>
  );
}
