// Unified Editor API for Monaco / CodeMirror extension runtime

type FormatterFn = (code: string) => Promise<string> | string;
type LinterFn = (code: string) => Array<{ message: string; severity: string; line?: number }>;
type ThemeListener = (theme: string) => void;
type IconThemeListener = (theme: string) => void;
type AutoCloseTagsListener = (enabled: boolean) => void;

class EditorApiManager {
  private formatters: FormatterFn[] = [];
  private linters: LinterFn[] = [];
  private theme: string = "vs-dark";
  private iconTheme: string = "default";
  private autoCloseTags: boolean = false;

  private themeListeners = new Set<ThemeListener>();
  private iconThemeListeners = new Set<IconThemeListener>();
  private autoCloseListeners = new Set<AutoCloseTagsListener>();

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

  lintCode(code: string) {
    const problems: any[] = [];
    for (const linter of this.linters) {
      try {
        const res = linter(code);
        if (Array.isArray(res)) problems.push(...res);
      } catch (err) {
        console.warn("Linter error:", err);
      }
    }
    return problems;
  }

  // Themes
  setTheme(name: string) {
    this.theme = name;
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
}

export const editorApi = new EditorApiManager();
export default editorApi;
