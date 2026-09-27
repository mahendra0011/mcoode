import api from '../axios';
import editorApi from './editorApi';

export interface InstalledExtension {
  id: string;
  name: string;
  publisher: string;
  version: string;
  description: string;
  icon?: string;
  installedAt: string;
  contributes?: {
    themes?: Array<{
      id: string;
      label: string;
      uiTheme: string;
      themeData: any;
    }>;
    snippets?: Array<{
      language: string;
      snippets: Array<{
        name: string;
        label: string;
        insertText: string;
        detail: string;
        documentation: string;
      }>;
    }>;
    commands?: any[];
  };
}

type InstalledListener = (installed: InstalledExtension[]) => void;
type InstallingListener = (installingIds: Set<string>) => void;

class ExtensionInstallerManager {
  private installed: Map<string, InstalledExtension> = new Map();
  private installing: Set<string> = new Set();
  private installedListeners: Set<InstalledListener> = new Set();
  private installingListeners: Set<InstallingListener> = new Set();
  private initialized = false;

  async init() {
    if (this.initialized) return;
    this.initialized = true;
    await this.fetchInstalled();
  }

  async fetchInstalled(): Promise<InstalledExtension[]> {
    try {
      const res = await api.get('/api/v1/extensions/installed');
      const list: InstalledExtension[] = res.data?.extensions || [];
      // 745: only replace local state on a well-formed response — a 404 or
      // reboot must never wipe installed themes/snippets from the editor.
      if (!Array.isArray(res.data?.extensions)) return this.getInstalledList();
      this.installed.clear();

      for (const ext of list) {
        this.installed.set(ext.id, ext);
        this.registerContributions(ext);
      }

      this.notifyInstalled();
      return list;
    } catch (err) {
      console.warn('[installer] Failed to fetch installed extensions:', err);
      return [];
    }
  }

  isInstalled(id: string): boolean {
    return this.installed.has(id);
  }

  isInstalling(id: string): boolean {
    return this.installing.has(id);
  }

  getInstalledList(): InstalledExtension[] {
    return Array.from(this.installed.values());
  }

  getInstalledThemes(): Array<{ id: string; label: string; themeData: any }> {
    const themes: Array<{ id: string; label: string; themeData: any }> = [];
    for (const ext of this.installed.values()) {
      if (ext.contributes?.themes) {
        for (const t of ext.contributes.themes) {
          themes.push({
            id: t.id,
            label: `${t.label} (${ext.name})`,
            themeData: t.themeData,
          });
        }
      }
    }
    return themes;
  }

  async install(ext: { id: string; name?: string; version?: string; downloadUrl?: string }): Promise<boolean> {
    if (this.installing.has(ext.id)) return false;

    this.installing.add(ext.id);
    this.notifyInstalling();

    try {
      const res = await api.post('/api/v1/extensions/install', {
        id: ext.id,
        version: ext.version,
        downloadUrl: ext.downloadUrl,
      });

      if (res.data?.ok && res.data.extension) {
        const installedExt: InstalledExtension = res.data.extension;
        this.installed.set(installedExt.id, installedExt);
        this.registerContributions(installedExt);

        editorApi.showToast?.(`Installed ${installedExt.name} successfully!`, 'success');
        this.notifyInstalled();
        return true;
      }
      throw new Error(res.data?.error || 'Installation failed');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Installation error';
      editorApi.showToast?.(`Failed to install: ${msg}`, 'warning');
      console.error('[installer] Install error:', err);
      return false;
    } finally {
      this.installing.delete(ext.id);
      this.notifyInstalling();
    }
  }

  async uninstall(id: string): Promise<boolean> {
    if (this.installing.has(id)) return false;

    this.installing.add(id);
    this.notifyInstalling();

    try {
      const res = await api.delete(`/api/v1/extensions/uninstall/${encodeURIComponent(id)}`);
      if (res.data?.ok) {
        const ext = this.installed.get(id);
        this.installed.delete(id);

        // Clean up only this extension's snippets (owner-tagged).
        if (ext?.contributes?.snippets) {
          for (const s of ext.contributes.snippets) {
            editorApi.unregisterSnippets?.(s.language, id);
          }
        }

        editorApi.showToast?.(`Uninstalled ${ext?.name || id}`, 'info');
        this.notifyInstalled();
        return true;
      }
      throw new Error(res.data?.error || 'Uninstall failed');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Uninstall error';
      editorApi.showToast?.(`Failed to uninstall: ${msg}`, 'warning');
      console.error('[installer] Uninstall error:', err);
      return false;
    } finally {
      this.installing.delete(id);
      this.notifyInstalling();
    }
  }

  applyTheme(themeId: string) {
    editorApi.setTheme?.(themeId);
    editorApi.showToast?.(`Active theme set to "${themeId}"`, 'success');
  }

  private registerContributions(ext: InstalledExtension) {
    // 1. Register Themes into Monaco
    if (ext.contributes?.themes && Array.isArray(ext.contributes.themes)) {
      for (const t of ext.contributes.themes) {
        // 747: validate theme shape before handing it to Monaco — a bad
        // themeData must not break editor init.
        if (t.themeData && t.id && (t.themeData.rules || t.themeData.colors || t.themeData.base)) {
          editorApi.defineMonacoTheme?.(t.id, t.themeData);
          console.log(`[installer] Registered Monaco theme "${t.label}" (${t.id})`);
        } else {
          console.warn(`[installer] Skipping invalid theme "${t?.label || t?.id}" from ${ext.id}`);
        }
      }
    }

    // 2. Register Snippets into Monaco (owner-tagged per 746)
    if (ext.contributes?.snippets && Array.isArray(ext.contributes.snippets)) {
      for (const s of ext.contributes.snippets) {
        if (s.language && Array.isArray(s.snippets)) {
          editorApi.registerSnippets?.(s.language, s.snippets, ext.id);
          console.log(`[installer] Registered ${s.snippets.length} snippets for ${s.language}`);
        }
      }
    }
  }

  subscribeInstalled(fn: InstalledListener): () => void {
    this.installedListeners.add(fn);
    fn(Array.from(this.installed.values()));
    return () => this.installedListeners.delete(fn);
  }

  subscribeInstalling(fn: InstallingListener): () => void {
    this.installingListeners.add(fn);
    fn(new Set(this.installing));
    return () => this.installingListeners.delete(fn);
  }

  private notifyInstalled() {
    const list = Array.from(this.installed.values());
    this.installedListeners.forEach((fn) => fn(list));
  }

  private notifyInstalling() {
    const set = new Set(this.installing);
    this.installingListeners.forEach((fn) => fn(set));
  }
}

export const extensionInstaller = new ExtensionInstallerManager();
export default extensionInstaller;
