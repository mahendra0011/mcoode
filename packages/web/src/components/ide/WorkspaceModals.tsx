import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, UploadCloud, X, FolderUp, FileText, Loader2, Sparkles } from 'lucide-react';

export interface WorkspaceModalsProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadZip: (file: File) => Promise<void> | void;
  onUploadFolder?: (files: FileList) => Promise<void> | void;
  onUploadDirectoryHandle?: (handle: any) => Promise<void> | void;
  onUploadDataTransferItems?: (items: DataTransferItemList) => Promise<void> | void;
  onUploadSingleFile?: (file: File) => Promise<void> | void;
  onCloneGit: (url: string) => Promise<void> | void;
  onStartUploading?: (text?: string) => void;
}

export function WorkspaceModals({
  isOpen,
  onClose,
  onUploadZip,
  onUploadFolder,
  onUploadDirectoryHandle,
  onUploadDataTransferItems,
  onUploadSingleFile,
  onCloneGit,
  onStartUploading,
}: WorkspaceModalsProps) {
  const [gitUrl, setGitUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [statusText, setStatusText] = useState('Uploading and processing files...');

  const handleClone = async () => {
    if (!gitUrl || isCreating) return;
    try {
      setIsCreating(true);
      setStatusText('Cloning repository from GitHub...');
      await onCloneGit(gitUrl);
      onClose();
    } catch {
      // Error handled in parent
    } finally {
      setIsCreating(false);
    }
  };

  const triggerFolderInput = () => {
    if (onStartUploading) onStartUploading('⚡ Scanning project files (skipping heavy cache/build dirs)...');
    const input = document.createElement('input');
    input.type = 'file';
    (input as any).webkitdirectory = true;
    (input as any).directory = true;
    input.multiple = true;
    input.onchange = (e: Event) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        onClose();
        if (onUploadFolder) {
          onUploadFolder(files);
        }
      } else {
        if (onStartUploading) onStartUploading('');
      }
    };
    input.click();
  };

  const handleTriggerFolderUpload = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (onStartUploading) {
      onStartUploading('⚡ Scanning project files (skipping heavy cache/build dirs)...');
    }
    onClose();

    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        (window as any).showDirectoryPicker({ mode: 'read' })
          .then((dirHandle: any) => {
            if (dirHandle) {
              if (onUploadDirectoryHandle) {
                onUploadDirectoryHandle(dirHandle);
              }
            } else {
              if (onStartUploading) onStartUploading('');
            }
          })
          .catch((err: any) => {
            if (err?.name === 'AbortError') {
              if (onStartUploading) onStartUploading('');
              return;
            }
            console.warn('showDirectoryPicker error, triggering fallback input:', err);
            triggerFolderInput();
          });
      } catch (err: any) {
        console.warn('showDirectoryPicker exception, triggering fallback input:', err);
        triggerFolderInput();
      }
    } else {
      triggerFolderInput();
    }
  };

  const handleTriggerSingleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = false;
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        onClose();
        if (onStartUploading) onStartUploading(`Uploading file '${file.name}'...`);
        if (onUploadSingleFile) {
          onUploadSingleFile(file);
        } else {
          onUploadZip(file);
        }
      }
    };
    input.click();
  };

  const handleTriggerZipUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        onClose();
        if (onStartUploading) onStartUploading(`Processing ZIP file '${file.name}'...`);
        onUploadZip(file);
      }
    };
    input.click();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0 && onUploadDataTransferItems) {
      onClose();
      if (onStartUploading) onStartUploading('Processing dropped folder...');
      onUploadDataTransferItems(e.dataTransfer.items);
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      onClose();
      if (onStartUploading) onStartUploading(`Processing file '${file.name}'...`);
      if (file.name.endsWith('.zip')) {
        onUploadZip(file);
      } else if (onUploadSingleFile) {
        onUploadSingleFile(file);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
        onClick={onClose}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="bg-[#18181b] border border-white/10 rounded-2xl w-[500px] overflow-hidden shadow-2xl relative"
        >
          {/* Animated Uploading Overlay when creating workspace */}
          <AnimatePresence>
            {isCreating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-[#18181b]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4"
              >
                <div className="relative flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-2 border-emerald-500/20 bg-emerald-500/10 flex items-center justify-center animate-pulse">
                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                  </div>
                  <Sparkles className="w-4 h-4 text-emerald-300 absolute -top-1 -right-1 animate-bounce" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-base font-semibold text-white tracking-wide">Uploading Project</h4>
                  <p className="text-xs text-emerald-400/90 font-medium">{statusText}</p>
                </div>

                <div className="w-full max-w-xs h-1.5 bg-white/10 rounded-full overflow-hidden relative">
                  <div className="h-full bg-gradient-to-r from-emerald-400 via-blue-500 to-purple-500 rounded-full animate-pulse w-full" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-between items-center p-4 border-b border-white/5 bg-white/5">
            <h3 className="font-semibold text-white/90">Add your project</h3>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClose} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></motion.button>
          </div>
          
          <div className="p-5 flex flex-col gap-4">
            {/* Drag & Drop Hero Zone */}
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-xl p-4 flex flex-col items-center justify-center text-center transition group cursor-pointer"
              onClick={handleTriggerFolderUpload}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <FolderUp className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-sm font-semibold text-white/90">Upload Folder</span>
              <span className="text-xs text-white/40 mt-0.5">Drag & drop or click to browse</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Option 2: Upload Single File */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleTriggerSingleFileUpload}
                className="border border-white/10 hover:border-purple-500/50 bg-white/[0.02] hover:bg-purple-500/5 rounded-xl p-3 flex items-center gap-3 cursor-pointer transition group"
              >
                <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-white/90">Single File</span>
                  <span className="text-[10px] text-white/50">Code / Doc / Image</span>
                </div>
              </motion.div>

              {/* Option 3: Upload ZIP Archive */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleTriggerZipUpload}
                className="border border-white/10 hover:border-blue-500/50 bg-white/[0.02] hover:bg-blue-500/5 rounded-xl p-3 flex items-center gap-3 cursor-pointer transition group"
              >
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:scale-105 transition-transform">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-white/90">ZIP Archive</span>
                  <span className="text-[10px] text-white/50">.zip project file</span>
                </div>
              </motion.div>
            </div>
            
            <div className="relative flex items-center my-0.5">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink-0 mx-4 text-white/30 text-[11px] uppercase tracking-wider">or</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs text-white/60 flex items-center gap-1.5"><Github className="w-3.5 h-3.5" /> Paste GitHub repo URL</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={gitUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGitUrl(e.target.value)}
                  placeholder="https://github.com/user/repo"
                  className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter' && gitUrl) {
                      e.preventDefault();
                      handleClone();
                    }
                  }}
                />
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  disabled={!gitUrl || isCreating}
                  onClick={handleClone}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition flex items-center gap-1.5"
                >
                  {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Clone'}
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
