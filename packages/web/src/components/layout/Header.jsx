import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ChevronDown, User } from 'lucide-react';
import { motion } from 'framer-motion';

const MotionLink = motion.create(Link);

export function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const tokens = localStorage.getItem('mcode_tokens');
    if (tokens) {
      try {
        const parsed = JSON.parse(tokens);
        if (parsed.access) setIsLoggedIn(true);
      } catch (e) {}
    }
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="fixed shadow-2xl/20 rounded-b-4xl top-2.5 inset-x-0 mx-auto w-full max-w-5xl bg-frame z-50 max-[850px]:top-0 max-[850px]:w-full max-[850px]:max-w-none max-[850px]:rounded-none max-[850px]:rounded-b-4xl max-[850px]:overflow-hidden"
    >
      <div className="h-20 max-[850px]:h-18 grid grid-cols-[1fr_auto_1fr] items-center px-4 max-[850px]:px-6 w-full">
        {/* Left Side: Logo */}
        <div className="flex justify-start items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Link to="/" className="flex items-center gap-2 ml-4 max-[850px]:ml-0">
              <motion.div
                className="w-6 h-6 rounded-full bg-foreground"
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.6, 1, 0.6]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <span className="text-lg font-semibold text-foreground leading-none max-[1200px]:hidden max-[850px]:inline">
                mcode
              </span>
            </Link>
          </motion.div>
        </div>

        {/* Center: Nav (Perfectly Centered via Grid) */}
        <div className="flex justify-center items-center max-[850px]:hidden">
          <nav className="flex items-center gap-1 max-[1200px]:gap-0">
            {['Products', 'AI', 'CLI', 'Resources', 'Pricing'].map((label, i) => {
              const hrefMap = { Products: '#', AI: '/ai', CLI: '/cli', Resources: '#', Pricing: '#pricing' };
              const isLink = label !== 'Products' && label !== 'Resources';
              const content = (
                <>
                  {label}
                  {label === 'Products' || label === 'Resources' ? (
                    <ChevronDown className="w-4 h-4 ml-1" />
                  ) : null}
                </>
              );
              return (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.15 + i * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isLink ? (
                    <Link
                      to={hrefMap[label]}
                      className="px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors rounded-full hover:bg-foreground/5 flex items-center"
                    >
                      {content}
                    </Link>
                  ) : (
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors rounded-full hover:bg-foreground/5">
                      {content}
                    </motion.button>
                  )}
                </motion.div>
              );
            })}
          </nav>
        </div>

        {/* Right Side: Auth & Mobile Menu */}
        <div className="flex justify-end items-center">
          <motion.div
            className="flex items-center gap-4 max-[850px]:hidden"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            {isLoggedIn ? (
              <MotionLink
                to="/settings"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-foreground hover:bg-accent/40 transition-colors"
              >
                <User className="w-5 h-5" />
              </MotionLink>
            ) : (
              <>
                <MotionLink
                  to="/login"
                  whileHover={{ x: 3 }}
                  className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
                >
                  Log in
                </MotionLink>
                <MotionLink
                  to="/signup"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="relative inline-flex items-center h-10 rounded-xl bg-accent overflow-hidden"
                >
                  <motion.span
                    className="relative z-10 px-5 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium"
                    whileHover={{ boxShadow: "0 0 20px rgba(74, 222, 128, 0.5)" }}
                  >
                    Sign up
                  </motion.span>
                  <motion.span
                    className="relative z-10 w-10 h-10 flex items-center justify-center text-black"
                    whileHover={{ rotate: -45 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <ArrowDownRight className="w-4 h-4" />
                  </motion.span>
                </MotionLink>
              </>
            )}
          </motion.div>

          <motion.button
            type="button"
            aria-label="Open menu"
            className="hidden max-[850px]:flex items-center justify-center w-10 h-10 ml-4"
            whileTap={{ scale: 0.9 }}
          >
            <motion.div
              className="w-8 h-4 relative flex flex-col justify-between cursor-pointer"
              animate={{
                opacity: [0.3, 1, 0.3]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <motion.span
                className="block h-0.5 w-full bg-foreground origin-center rounded-full"
                animate={{ rotate: [0, 5, 0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
              <motion.span
                className="block h-0.5 w-full bg-foreground origin-center rounded-full"
                animate={{ rotate: [0, -5, 0, 5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: 0.1 }}
              />
            </motion.div>
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
}
