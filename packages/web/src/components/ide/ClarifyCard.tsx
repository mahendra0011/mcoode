import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';

export interface ClarifyCardProps {
  question: { question: string; options: string[]; answer: string | null };
  onAnswer: (question: string, answer: string) => void;
}

export function ClarifyCard({ question, onAnswer }: ClarifyCardProps) {
  if (question.answer) return null; // collapses once answered
  const labels = ['A', 'B', 'C', 'D'];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="w-full mb-4 bg-[#151515] border border-blue-500/20 rounded-xl p-4"
    >
      <div className="flex items-start gap-2 mb-3">
        <HelpCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
        <span className="text-sm font-medium text-white/90">{question.question}</span>
      </div>
      <div className="grid grid-cols-1 gap-1.5">
        {question.options.map((opt, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: 1.01, x: 2 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onAnswer(question.question, opt)}
            className="text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-blue-500/10 hover:border-blue-500/30 border border-white/5 text-xs text-white/70 hover:text-white/90 transition-colors flex gap-2"
          >
            <span className="text-blue-400 font-mono">{labels[i] || `${i + 1}`}</span>
            <span>{opt}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
