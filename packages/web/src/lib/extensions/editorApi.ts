// Unified Editor API for Monaco / CodeMirror extension runtime

export type FormatterFn = (code: string) => Promise<string> | string;
export type LinterFn = (code: string) => Array<{ message: string; severity: string; line?: number; column?: number }>;
export type ThemeListener = (theme: string) => void;
export type IconThemeListener = (theme: string) => void;
export type AutoCloseTagsListener = (enabled: boolean) => void;
export type ToastListener = (toast: { message: string; type: "info" | "success" | "warning" }) => void;

export interface MonacoSnippet {
  label: string;
  insertText: string;
  detail?: string;
  documentation?: string;
}

class EditorApiManager {
  private formatters: FormatterFn[] = [];
  private linters: LinterFn[] = [];
  private theme: string = "vs-dark";
  private iconTheme: string = "default";
  private autoCloseTags: boolean = false;

  private monacoInstance: any = null;
  private editorInstance: any = null;
  private snippetDisposables: Map<string, any[]> = new Map();
  private decoratorDisposables: Map<string, () => void> = new Map();

  private themeListeners = new Set<ThemeListener>();
  private iconThemeListeners = new Set<IconThemeListener>();
  private autoCloseListeners = new Set<AutoCloseTagsListener>();
  private toastListeners = new Set<ToastListener>();

  // Attach live Monaco and active editor
  attachEditor(editor: any, monaco: any) {
    this.editorInstance = editor;
    this.monacoInstance = monaco;
    if (this.theme && monaco?.editor?.setTheme) {
      try {
        monaco.editor.setTheme(this.theme);
      } catch (e) {
        console.warn("Could not set theme on editor attach:", e);
      }
    }
  }

  getMonaco() {
    return this.monacoInstance;
  }

  getEditor() {
    return this.editorInstance;
  }

  // Formatting
  registerFormatter(fn: FormatterFn) {
    this.formatters.push(fn);
  }

  unregisterFormatter() {
    this.formatters = [];
  }

  async formatCode(code: string): Promise<string> {
    let result = code;
    for (const fmt of this.formatters) {
      try {
        result = await fmt(result);
      } catch (err) {
        console.warn("Formatter error:", err);
      }
    }
    return result;
  }

  // Linting
  registerLinter(fn: LinterFn) {
    this.linters.push(fn);
  }

  unregisterLinter() {
    this.linters = [];
  }

  async lintCode(code: string) {
    const problems: any[] = [];
    for (const linter of this.linters) {
      try {
        const res = await linter(code);
        if (Array.isArray(res)) problems.push(...res);
      } catch (err) {
        console.warn("Linter error:", err);
      }
    }
    return problems;
  }

  // Themes
  defineMonacoTheme(name: string, themeData: any) {
    if (this.monacoInstance?.editor?.defineTheme) {
      try {
        this.monacoInstance.editor.defineTheme(name, themeData);
      } catch (e) {
        console.warn(`Error defining theme ${name}:`, e);
      }
    }
  }

  setTheme(name: string) {
    this.theme = name;
    if (this.monacoInstance?.editor?.setTheme) {
      try {
        this.monacoInstance.editor.setTheme(name);
      } catch (e) {
        console.warn(`Error applying theme ${name}:`, e);
      }
    }
    this.themeListeners.forEach((fn) => fn(name));
  }

  getTheme() {
    return this.theme;
  }

  subscribeTheme(fn: ThemeListener) {
    this.themeListeners.add(fn);
    return () => {
      this.themeListeners.delete(fn);
    };
  }

  // Icon Theme
  setIconTheme(name: string) {
    this.iconTheme = name;
    this.iconThemeListeners.forEach((fn) => fn(name));
  }

  getIconTheme() {
    return this.iconTheme;
  }

  subscribeIconTheme(fn: IconThemeListener) {
    this.iconThemeListeners.add(fn);
    return () => {
      this.iconThemeListeners.delete(fn);
    };
  }

  // Auto Close Tags
  setAutoCloseTags(enabled: boolean) {
    this.autoCloseTags = enabled;
    this.autoCloseListeners.forEach((fn) => fn(enabled));
  }

  getAutoCloseTags() {
    return this.autoCloseTags;
  }

  subscribeAutoCloseTags(fn: AutoCloseTagsListener) {
    this.autoCloseListeners.add(fn);
    return () => {
      this.autoCloseListeners.delete(fn);
    };
  }

  // Snippets
  registerSnippets(language: string, snippets: MonacoSnippet[]) {
    if (!this.monacoInstance?.languages?.registerCompletionItemProvider) return;

    try {
      const monaco = this.monacoInstance;
      const provider = monaco.languages.registerCompletionItemProvider(language, {
        provideCompletionItems: () => {
          const suggestions = snippets.map((s) => ({
            label: s.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: s.insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: s.detail || "Extension Snippet",
            documentation: s.documentation || s.detail || s.label,
          }));
          return { suggestions };
        },
      });

      const current = this.snippetDisposables.get(language) || [];
      current.push(provider);
      this.snippetDisposables.set(language, current);
    } catch (e) {
      console.warn(`Failed to register snippets for ${language}:`, e);
    }
  }

  unregisterSnippets(language?: string) {
    if (language) {
      const disposables = this.snippetDisposables.get(language) || [];
      disposables.forEach((d) => d.dispose?.());
      this.snippetDisposables.delete(language);
    } else {
      this.snippetDisposables.forEach((disposables) => {
        disposables.forEach((d) => d.dispose?.());
      });
      this.snippetDisposables.clear();
    }
  }

  // Decorators / Custom UI features
  registerDecorator(id: string, fn: (editor: any, monaco: any) => (() => void) | void) {
    if (this.editorInstance && this.monacoInstance) {
      try {
        const cleanup = fn(this.editorInstance, this.monacoInstance);
        if (typeof cleanup === "function") {
          this.decoratorDisposables.set(id, cleanup);
        }
      } catch (e) {
        console.warn(`Error registering decorator ${id}:`, e);
      }
    }
  }

  unregisterDecorator(id: string) {
    const cleanup = this.decoratorDisposables.get(id);
    if (cleanup) {
      try {
        cleanup();
      } catch (e) {
        console.warn(`Error cleaning up decorator ${id}:`, e);
      }
      this.decoratorDisposables.delete(id);
    }
  }

  // Toasts / Notifications
  showToast(message: string, type: "info" | "success" | "warning" = "info") {
    this.toastListeners.forEach((fn) => fn({ message, type }));
  }

  subscribeToast(fn: ToastListener) {
    this.toastListeners.add(fn);
    return () => {
      this.toastListeners.delete(fn);
    };
  }
}

export const editorApi = new EditorApiManager();
export default editorApi;
