import { useState } from 'react';
import { Upload, GitBranch, X, Plus } from 'lucide-react';
import { createZipWorkspace, createGitWorkspace } from '../../api/chatApi.js';
import { pushToast } from '../../store/slices/toastSlice.js';
import { useDispatch } from 'react-redux';

/**
 * Modal for creating a new workspace via ZIP upload or Git clone.
 */
export function WorkspaceModal({ open, onClose, onCreated }) {
  const dispatch = useDispatch();
  const [tab, setTab] = useState('zip'); // 'zip' | 'git'
  const [zipFile, setZipFile] = useState(null);
  const [gitForm, setGitForm] = useState({ name: '', repoUrl: '', branch: 'current', branchName: '' });
  const [isCreating, setIsCreating] = useState(false);

  if (!open) return null;

  const handleZipSubmit = async () => {
    if (!zipFile) {
      dispatch(pushToast({ kind: 'err', text: 'please select a zip file' }));
      return;
    }
    const name = zipFile.name.replace(/\.zip$/, '');
    setIsCreating(true);
    try {
      // Upload as multipart form
      const formData = new FormData();
      formData.append('name', name);
      formData.append('source', 'zip');
      formData.append('zipfile', zipFile);
      await createZipWorkspace(formData);
      dispatch(pushToast({ kind: 'ok', text: `workspace "${name}" created` }));
      onCreated && onCreated();
      onClose();
    } catch (err) {
      dispatch(pushToast({ kind: 'err', text: `failed to create workspace: ${err.message}` }));
    } finally {
      setIsCreating(false);
    }
  };

  const handleGitSubmit = async () => {
    if (!gitForm.name || !gitForm.repoUrl) {
      dispatch(pushToast({ kind: 'err', text: 'name and repo URL are required' }));
      return;
    }
    setIsCreating(true);
    try {
      await createGitWorkspace({
        name: gitForm.name,
        repoUrl: gitForm.repoUrl,
        branch: gitForm.branch,
        branchName: gitForm.branch === 'new' ? gitForm.branchName : ''
      });
      dispatch(pushToast({ kind: 'ok', text: `workspace "${gitForm.name}" created` }));
      onCreated && onCreated();
      onClose();
    } catch (err) {
      dispatch(pushToast({ kind: 'err', text: `failed to clone repo: ${err.message}` }));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur">
      <div className="w-full max-w-md rounded-lg border border-mcode-border bg-mcode-panel">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-mcode-border px-4 py-3">
          <h3 className="font-mono text-sm text-mcode-green">New workspace</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-500 hover:bg-mcode-bg hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-mcode-border">
          <button
            onClick={() => setTab('zip')}
            className={`flex-1 rounded-t-md border-b-2 px-4 py-2 font-mono text-xs ${
              tab === 'zip'
                ? 'border-mcode-green text-mcode-green'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Upload ZIP
          </button>
          <button
            onClick={() => setTab('git')}
            className={`flex-1 rounded-t-md border-b-2 px-4 py-2 font-mono text-xs ${
              tab === 'git'
                ? 'border-mcode-green text-mcode-green'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Clone from Git
          </button>
        </div>

        <div className="p-4">
          {tab === 'zip' && (
            <div className="space-y-3">
              <div>
                <label className="block font-mono text-xs text-gray-600">Project name</label>
                <input
                  type="text"
                  placeholder="my-app"
                  className="w-full rounded-md border border-mcode-border bg-mcode-bg px-2 py-1.5 font-mono text-sm text-gray-200 focus:outline-none focus:border-mcode-green"
                  defaultValue={zipFile?.name?.replace(/\.zip$/, '') || ''}
                  onChange={(e) => setZipFile(zipFile ? { ...zipFile, name: e.target.value + '.zip' } : zipFile)}
                />
              </div>
              <div
                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setZipFile(e.dataTransfer.files[0]); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                className="flex h-24 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-mcode-border bg-mcode-bg font-mono text-xs text-gray-500 hover:border-mcode-green/50 hover:text-mcode-green"
                onClick={() => document.getElementById('zip-input').click()}
              >
                <div className="text-center">
                  <Upload className="mx-auto h-6 w-6" />
                  <span className="mt-1 block">{zipFile?.name || 'Drop a .zip file or click to browse'}</span>
                </div>
                <input
                  id="zip-input"
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={(e) => setZipFile(e.target.files?.[0])}
                />
              </div>
            </div>
          )}
          {tab === 'git' && (
            <div className="space-y-3">
              <div>
                <label className="block font-mono text-xs text-gray-600">Project name</label>
                <input
                  type="text"
                  placeholder="my-app"
                  value={gitForm.name}
                  onChange={(e) => setGitForm({ ...gitForm, name: e.target.value })}
                  className="w-full rounded-md border border-mcode-border bg-mcode-bg px-2 py-1.5 font-mono text-sm text-gray-200 focus:outline-none focus:border-mcode-green"
                />
              </div>
              <div>
                <label className="block font-mono text-xs text-gray-600">Repository URL</label>
                <input
                  type="url"
                  placeholder="https://github.com/user/repo.git"
                  value={gitForm.repoUrl}
                  onChange={(e) => setGitForm({ ...gitForm, repoUrl: e.target.value })}
                  className="w-full rounded-md border border-mcode-border bg-mcode-bg px-2 py-1.5 font-mono text-sm text-gray-200 focus:outline-none focus:border-mcode-green"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 font-mono text-xs text-gray-600">
                  <GitBranch className="h-3 w-3" />
                  <span>Branch</span>
                </label>
                <div className="mt-1 space-y-2">
                  <label className="flex items-center gap-2 font-mono text-xs">
                    <input
                      type="radio"
                      name="branch"
                      checked={gitForm.branch === 'current'}
                      onChange={() => setGitForm({ ...gitForm, branch: 'current' })}
                      className="text-mcode-green"
                    />
                    <span>Current branch (default)</span>
                  </label>
                  <label className="flex items-center gap-2 font-mono text-xs">
                    <input
                      type="radio"
                      name="branch"
                      checked={gitForm.branch === 'new'}
                      onChange={() => setGitForm({ ...gitForm, branch: 'new' })}
                      className="text-mcode-green"
                    />
                    <span>Custom branch</span>
                  </label>
                  {gitForm.branch === 'new' && (
                    <input
                      type="text"
                      placeholder="branch name"
                      value={gitForm.branchName}
                      onChange={(e) => setGitForm({ ...gitForm, branchName: e.target.value })}
                      className="w-full rounded-md border border-mcode-border bg-mcode-bg px-2 py-1 font-mono text-sm text-gray-200 focus:outline-none focus:border-mcode-green"
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-mcode-border px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-md border border-mcode-border px-3 py-1.5 font-mono text-xs text-gray-400 hover:border-mcode-green/50 hover:text-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={tab === 'zip' ? handleZipSubmit : handleGitSubmit}
            disabled={isCreating}
            className="rounded-md bg-mcode-green px-3 py-1.5 font-mono text-xs text-black font-semibold hover:bg-mcode-greenBright disabled:opacity-50"
          >
            {isCreating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
