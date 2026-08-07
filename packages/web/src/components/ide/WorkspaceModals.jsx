import React, { useState } from 'react';
import { UploadCloud, Github, X } from 'lucide-react';

export function WorkspaceModals({ isOpen, onClose, onUploadZip, onCloneGit }) {
  const [mode, setMode] = useState(null); // 'zip' | 'git'
  const [gitUrl, setGitUrl] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'zip' && file) {
        await onUploadZip(file);
      } else if (mode === 'git' && gitUrl) {
        await onCloneGit(gitUrl);
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to create workspace');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#151515] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition">
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-xl font-bold text-white mb-6">Add your project</h2>
        
        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
            <p className="text-sm text-white/70">
              {mode === 'zip' ? 'Extracting archive...' : 'Cloning repository...'}
            </p>
          </div>
        ) : !mode ? (
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setMode('zip')}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition group"
            >
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition">
                <UploadCloud className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-sm font-medium text-white/90">Upload ZIP</span>
            </button>

            <button 
              onClick={() => setMode('git')}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition group"
            >
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition">
                <Github className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-white/90">Clone GitHub</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'zip' ? (
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">ZIP Archive</label>
                <input 
                  type="file" 
                  accept=".zip"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  required
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">GitHub Repo URL</label>
                <input 
                  type="url" 
                  placeholder="https://github.com/user/repo"
                  value={gitUrl}
                  onChange={(e) => setGitUrl(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50"
                  required
                />
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button 
                type="button" 
                onClick={() => setMode(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-sm font-medium text-white transition"
              >
                Back
              </button>
              <button 
                type="submit" 
                disabled={mode === 'zip' && !file}
                className="flex-1 px-4 py-2 rounded-lg bg-emerald-500 text-black hover:bg-emerald-400 text-sm font-medium transition disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
