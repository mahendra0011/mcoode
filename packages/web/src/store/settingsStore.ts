import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useIDEStore } from './ideStore';

export interface AISettings {
  streamSpeed: 'fast' | 'normal' | 'balanced';
  contextSensitivity: 'high' | 'medium' | 'low';
  autoFixLints: boolean;
  autoExecution: 'auto' | 'request-review' | 'strict';
  reviewPolicy: 'always-ask' | 'auto' | 'skip';
  inlineAssist: boolean;
  tabGitignoreAccess: boolean;
}

export interface CoreEditorSettings {
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  minimap: boolean;
  formatOnSave: boolean;
  autoSave: boolean;
}

export interface AdvancedEditorSettings {
  cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid';
  cursorStyle: 'line' | 'block' | 'underline' | 'line-thin' | 'block-outline';
  cursorSmoothCaretAnimation: 'off' | 'on' | 'explicit';
  renderWhitespace: 'none' | 'boundary' | 'selection' | 'trailing' | 'all';
  bracketPairColorization: boolean;
  smoothScrolling: boolean;
  autoClosingBrackets: 'always' | 'languageDefined' | 'beforeWhitespace' | 'never';
  autoClosingQuotes: 'always' | 'languageDefined' | 'beforeWhitespace' | 'never';
  formatOnPaste: boolean;
  formatOnType: boolean;
  defaultFormatter: 'prettier' | 'eslint' | 'none';
  autoIndent: 'full' | 'advanced' | 'brackets' | 'keep' | 'none';
  findSeedSelection: boolean;
  findAutoInSelection: 'never' | 'always' | 'multiline';
  findAddExtraSpace: boolean;
  diffSideBySide: boolean;
  diffIgnoreTrimWhitespace: boolean;
  diffRenderIndicators: boolean;
  autoSaveDelay: number;
  eol: 'auto' | '\n' | '\r\n';
  encoding: 'utf8' | 'utf8bom' | 'utf16le' | 'utf16be';
}

export interface TerminalSettings {
  fontSize: number;
  fontFamily: string;
  cursorStyle: 'block' | 'underline' | 'bar';
  cursorBlink: boolean;
  scrollback: number;
  copyOnSelection: boolean;
  shellIntegration: boolean;
}

export interface AppearanceSettings {
  colorTheme: string;
  iconTheme: 'seti' | 'material' | 'minimal' | 'none';
  chatFontSize: number;
  verboseChat: boolean;
  uiScale: '100%' | '110%' | '120%';
}

export interface SecuritySettings {
  agentSecurityMode: 'full' | 'sandboxed' | 'strict';
  nonWorkspaceAccess: boolean;
  autoOpenEdited: boolean;
}

export interface AccountSettings {
  telemetry: boolean;
  marketingEmails: boolean;
}

export interface SystemSettings {
  terminalInheritProfile: boolean;
  integratedTerminalShell: 'Auto' | 'Git Bash' | 'PowerShell' | 'Command Prompt';
  taskNotifications: boolean;
  notificationSound: boolean;
  keepAwake: boolean;
  closeToTrayOnWindows: boolean;
  desktopChromiumHardwareAcceleration: boolean;
  receivePreviewUpdates: boolean;
  autoDownloadAndInstallUpdates: boolean;
  locale: string;
  loggingLevel: 'debug' | 'info' | 'warn' | 'error';
  loggingFormat: 'text' | 'json' | 'jsonl';
}

export interface AgentArchitectureSettings {
  workspaceMemory: boolean;
  keepModelIO: boolean;
  showReasoning: boolean;
  showTodos: boolean;
  autoArchive: boolean;
  archiveRetention: '7 days' | '14 days' | '30 days' | '90 days';
  interactionBehavior: 'Queue' | 'Inline' | 'Modal';
  autoContinue: boolean;
  browserUse: boolean;
  computerUse: boolean;
  toolGroupingExplore: boolean;
  toolGroupingTerminal: boolean;
  toolGroupingChanges: boolean;
  askUserQuestionAutoResolution: boolean;
  optimizeAgentExperience: boolean;
  embeddedBrowserAllowInsecureCertificates: boolean;
  embeddedBrowserViewportMode: 'normal' | 'mobile' | 'custom';
}

export interface NetworkSettings {
  httpProxy: string;
  noProxy: string;
  customCert: string;
}

export interface DataSettings {
  indexNewFolders: boolean;
  indexReposGrep: boolean;
  instantGrepIndexing: boolean;
  repoSnapshotIndexing: boolean;
  nativeSearchEnhancements: boolean;
}

export interface SettingsState {
  ai: AISettings;
  editor: CoreEditorSettings;
  advancedEditor: AdvancedEditorSettings;
  terminal: TerminalSettings;
  appearance: AppearanceSettings;
  security: SecuritySettings;
  account: AccountSettings;
  agent: AgentArchitectureSettings;
  network: NetworkSettings;
  system: SystemSettings;
  data: DataSettings;
  plugins: Record<string, boolean>;

  updateAISetting: <K extends keyof AISettings>(k: K, v: AISettings[K]) => void;
  updateEditorSetting: <K extends keyof CoreEditorSettings>(k: K, v: CoreEditorSettings[K]) => void;
  updateAdvancedEditorSetting: <K extends keyof AdvancedEditorSettings>(k: K, v: AdvancedEditorSettings[K]) => void;
  updateTerminalSetting: <K extends keyof TerminalSettings>(k: K, v: TerminalSettings[K]) => void;
  updateAppearanceSetting: <K extends keyof AppearanceSettings>(k: K, v: AppearanceSettings[K]) => void;
  updateSecuritySetting: <K extends keyof SecuritySettings>(k: K, v: SecuritySettings[K]) => void;
  updateAccountSetting: <K extends keyof AccountSettings>(k: K, v: AccountSettings[K]) => void;
  updateAgentSetting: <K extends keyof AgentArchitectureSettings>(k: K, v: AgentArchitectureSettings[K]) => void;
  updateNetworkSetting: <K extends keyof NetworkSettings>(k: K, v: NetworkSettings[K]) => void;
  updateSystemSetting: <K extends keyof SystemSettings>(k: K, v: SystemSettings[K]) => void;
  updateDataSetting: <K extends keyof DataSettings>(k: K, v: DataSettings[K]) => void;
  togglePlugin: (id: string) => void;
  updatePluginSetting: (id: string, enabled: boolean) => void;

  getMonacoOptions: () => Record<string, any>;
  applyTheme: (themeName: string) => void;
}

let lastEditorSettings: any = null;
let lastAdvancedEditorSettings: any = null;
let cachedMonacoOptions: Record<string, any> | null = null;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ai: {
        streamSpeed: 'fast',
        contextSensitivity: 'high',
        autoFixLints: true,
        autoExecution: 'request-review',
        reviewPolicy: 'always-ask',
        inlineAssist: true,
        tabGitignoreAccess: false,
      },
      editor: {
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
        tabSize: 2,
        wordWrap: false,
        lineNumbers: true,
        minimap: false,
        formatOnSave: false,
        autoSave: false,
      },
      advancedEditor: {
        cursorBlinking: 'blink',
        cursorStyle: 'line',
        cursorSmoothCaretAnimation: 'off',
        renderWhitespace: 'selection',
        bracketPairColorization: true,
        smoothScrolling: true,
        autoClosingBrackets: 'always',
        autoClosingQuotes: 'always',
        formatOnPaste: false,
        formatOnType: false,
        defaultFormatter: 'prettier',
        autoIndent: 'full',
        findSeedSelection: true,
        findAutoInSelection: 'never',
        findAddExtraSpace: true,
        diffSideBySide: true,
        diffIgnoreTrimWhitespace: true,
        diffRenderIndicators: true,
        autoSaveDelay: 1000,
        eol: 'auto',
        encoding: 'utf8',
      },
      terminal: {
        fontSize: 13,
        fontFamily: 'monospace',
        cursorStyle: 'block',
        cursorBlink: true,
        scrollback: 5000,
        copyOnSelection: false,
        shellIntegration: true,
      },
      appearance: {
        colorTheme: 'mcode-dark',
        iconTheme: 'seti',
        chatFontSize: 14,
        verboseChat: false,
        uiScale: '100%',
      },
      security: {
        agentSecurityMode: 'sandboxed',
        nonWorkspaceAccess: false,
        autoOpenEdited: true,
      },
      account: {
        telemetry: true,
        marketingEmails: false,
      },
      agent: {
        workspaceMemory: true,
        keepModelIO: false,
        showReasoning: false,
        showTodos: true,
        autoArchive: true,
        archiveRetention: '7 days',
        interactionBehavior: 'Queue',
        autoContinue: false,
        browserUse: true,
        computerUse: true,
        toolGroupingExplore: true,
        toolGroupingTerminal: true,
        toolGroupingChanges: false,
        askUserQuestionAutoResolution: true,
        optimizeAgentExperience: false,
        embeddedBrowserAllowInsecureCertificates: false,
        embeddedBrowserViewportMode: 'normal',
      },
      network: {
        httpProxy: '',
        noProxy: 'localhost,127.0.0.1,::1',
        customCert: '',
      },
      system: {
        terminalInheritProfile: true,
        integratedTerminalShell: 'Auto',
        taskNotifications: true,
        notificationSound: false,
        keepAwake: false,
        closeToTrayOnWindows: true,
        desktopChromiumHardwareAcceleration: true,
        receivePreviewUpdates: false,
        autoDownloadAndInstallUpdates: false,
        locale: 'en-US',
        loggingLevel: 'info',
        loggingFormat: 'text',
      },
      data: {
        indexNewFolders: true,
        indexReposGrep: false,
        instantGrepIndexing: false,
        repoSnapshotIndexing: false,
        nativeSearchEnhancements: true,
      },
      plugins: {
        'android-emulator': false,
        'browser-use': true,
        'document-skills': true,
        'ios-simulator': false,
        'restore-legacy-sessions': false,
        'skill-creator': true,
        'mcode-guide': true,
        'computer-use': true,
      },

      updateAISetting: (k, v) => set((s) => ({ ai: { ...s.ai, [k]: v } })),

      updateEditorSetting: (k, v) => {
        set((s) => ({ editor: { ...s.editor, [k]: v } }));
        const activeEditor = useIDEStore.getState().activeEditor;
        if (activeEditor) {
          activeEditor.updateOptions(get().getMonacoOptions());
        }
        if (k === 'wordWrap') {
          useIDEStore.setState({ wordWrap: Boolean(v) });
        }
        if (k === 'autoSave') {
          useIDEStore.setState({ autoSaveEnabled: Boolean(v) });
        }
      },

      updateAdvancedEditorSetting: (k, v) => {
        set((s) => ({ advancedEditor: { ...s.advancedEditor, [k]: v } }));
        const activeEditor = useIDEStore.getState().activeEditor;
        if (activeEditor) {
          activeEditor.updateOptions(get().getMonacoOptions());
        }
      },

      updateTerminalSetting: (k, v) => {
        set((s) => ({ terminal: { ...s.terminal, [k]: v } }));
        if (typeof window !== 'undefined') {
          const keyMap: Record<string, string> = {
            fontSize: 'mcode.terminal.fontSize',
            fontFamily: 'mcode.terminal.fontFamily',
            cursorStyle: 'mcode.terminal.cursorStyle',
            cursorBlink: 'mcode.terminal.cursorBlink',
            scrollback: 'mcode.terminal.scrollback',
            copyOnSelection: 'mcode.terminal.copyOnSelection',
          };
          if (keyMap[k]) {
            localStorage.setItem(keyMap[k], String(v));
          }
          window.dispatchEvent(new CustomEvent('mcode:terminal-settings-updated'));
        }
      },

      updateAppearanceSetting: (k, v) => {
        set((s) => ({ appearance: { ...s.appearance, [k]: v } }));
        if (k === 'colorTheme') {
          get().applyTheme(String(v));
        }
      },

      updateSecuritySetting: (k, v) => set((s) => ({ security: { ...s.security, [k]: v } })),
      updateAccountSetting: (k, v) => set((s) => ({ account: { ...s.account, [k]: v } })),
      updateAgentSetting: (k, v) => set((s) => ({ agent: { ...s.agent, [k]: v } })),
      updateNetworkSetting: (k, v) => set((s) => ({ network: { ...s.network, [k]: v } })),
      updateSystemSetting: (k, v) => set((s) => ({ system: { ...s.system, [k]: v } })),
      updateDataSetting: (k, v) => set((s) => ({ data: { ...s.data, [k]: v } })),
      togglePlugin: (id: string) =>
        set((s) => ({
          plugins: {
            ...s.plugins,
            [id]: !s.plugins[id],
          },
        })),
      updatePluginSetting: (id: string, enabled: boolean) =>
        set((s) => ({
          plugins: {
            ...s.plugins,
            [id]: enabled,
          },
        })),

      getMonacoOptions: () => {
        const { editor, advancedEditor } = get();
        if (
          cachedMonacoOptions &&
          lastEditorSettings === editor &&
          lastAdvancedEditorSettings === advancedEditor
        ) {
          return cachedMonacoOptions;
        }
        lastEditorSettings = editor;
        lastAdvancedEditorSettings = advancedEditor;
        cachedMonacoOptions = {
          fontSize: editor.fontSize,
          fontFamily: editor.fontFamily,
          tabSize: editor.tabSize,
          wordWrap: editor.wordWrap ? 'on' : 'off',
          lineNumbers: editor.lineNumbers ? 'on' : 'off',
          minimap: { enabled: editor.minimap },
          cursorBlinking: advancedEditor.cursorBlinking,
          cursorStyle: advancedEditor.cursorStyle,
          cursorSmoothCaretAnimation: advancedEditor.cursorSmoothCaretAnimation,
          renderWhitespace: advancedEditor.renderWhitespace,
          'bracketPairColorization.enabled': advancedEditor.bracketPairColorization,
          smoothScrolling: advancedEditor.smoothScrolling,
          autoClosingBrackets: advancedEditor.autoClosingBrackets,
          autoClosingQuotes: advancedEditor.autoClosingQuotes,
          formatOnPaste: advancedEditor.formatOnPaste,
          formatOnType: advancedEditor.formatOnType,
          autoIndent: advancedEditor.autoIndent,
          glyphMargin: true,
          scrollBeyondLastLine: false,
          renderLineHighlight: 'all',
        };
        return cachedMonacoOptions;
      },

      applyTheme: (themeName: string) => {
        if (typeof document === 'undefined') return;
        document.documentElement.setAttribute('data-theme', themeName);
        const isLight = themeName.includes('light');
        if (isLight) {
          document.documentElement.classList.remove('dark');
          document.documentElement.classList.add('light');
        } else {
          document.documentElement.classList.remove('light');
          document.documentElement.classList.add('dark');
        }

        const activeMonaco = useIDEStore.getState().activeMonaco;
        if (activeMonaco) {
          if (themeName === 'mcode-light' || themeName === 'github-light') {
            activeMonaco.editor.setTheme('vs');
          } else if (themeName === 'one-dark') {
            activeMonaco.editor.setTheme('one-dark-pro');
          } else {
            activeMonaco.editor.setTheme('vs-dark');
          }
        }
      },
    }),
    {
      name: 'mcode_unified_settings',
    }
  )
);
