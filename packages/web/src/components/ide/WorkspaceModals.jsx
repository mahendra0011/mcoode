import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, UploadCloud, X, FolderUp, Loader2 } from 'lucide-react';

export function WorkspaceModals({ isOpen, onClose, onUploadZip, onCloneGit }) {
  const [gitUrl, setGitUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleClone = async () => {
    if (!gitUrl || isCreating) return;
    try {
      setIsCreating(true);
      await onCloneGit(gitUrl);
      onClose();
    } catch {
      // Error already surfaced via toast in onCloneGit
    } finally {
      setIsCreating(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="bg-[#18181b] border border-white/10 rounded-2xl w-[400px] overflow-hidden shadow-2xl"
        >
          <div className="flex justify-between items-center p-4 border-b border-white/5 bg-white/5">
            <h3 className="font-semibold text-white/90">Add your project</h3>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClose} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></motion.button>
          </div>
          
          <div className="p-4 flex flex-col gap-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={async () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.zip';
                input.onchange = async (e) => {
                  if (e.target.files[0]) {
                    try {
                      setIsCreating(true);
                      await onUploadZip(e.target.files[0]);
                      onClose();
                    } catch {
                      // Error already surfaced via toast in onUploadZip
                    } finally {
                      setIsCreating(false);
                    }
                  }
                };
                input.click();
              }}
              className="border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-white/20 hover:bg-white/5 transition"
            >
              <FolderUp className="w-8 h-8 text-white/30" />
              <span className="text-sm font-medium text-white/80">Upload ZIP</span>
              <span className="text-xs text-white/40">Select a local project archive</span>
            </motion.div>
            
            <div className="relative flex items-center">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink-0 mx-4 text-white/30 text-xs uppercase tracking-wider">or</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs text-white/60 flex items-center gap-1.5"><Github className="w-3.5 h-3.5" /> Paste GitHub repo URL</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={gitUrl}
                  onChange={e => setGitUrl(e.target.value)}
                  placeholder="https://github.com/user/repo"
                  className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && gitUrl) {
                      e.preventDefault();
                      handleClone();
                    }
                  }}
                />
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  disabled={!gitUrl || isCreating}
                  onClick={handleClone}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
                >
                  Clone
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
