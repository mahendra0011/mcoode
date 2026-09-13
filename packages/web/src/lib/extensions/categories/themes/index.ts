import { EditorExtensionRuntime } from '@/types/extension';
import { themes } from './themeDefinitions';

function createThemeRuntime(id: string, themeName: string): EditorExtensionRuntime {
  return {
    id,
    activate: (editorApi) => {
      const themeData = themes[themeName];
      if (themeData) {
        editorApi.defineMonacoTheme?.(themeName, themeData);
      }
      editorApi.setTheme?.(themeName);
      editorApi.showToast?.(`Theme applied: ${themeName}`, 'success');
    },
    deactivate: (editorApi) => {
      editorApi.setTheme?.('vs-dark');
    },
  };
}

function createIconThemeRuntime(id: string, iconThemeName: string): EditorExtensionRuntime {
  return {
    id,
    activate: (editorApi) => {
      editorApi.setIconTheme?.(iconThemeName);
      editorApi.showToast?.(`Icon theme applied: ${iconThemeName}`, 'success');
    },
    deactivate: (editorApi) => {
      editorApi.setIconTheme?.('default');
    },
  };
}

export const themeExtensions: Record<string, EditorExtensionRuntime> = {
  // Classic themes
  'one-dark-theme': createThemeRuntime('one-dark-theme', 'one-dark-pro'),
  'zhuangtongfa.material-theme': createThemeRuntime('zhuangtongfa.material-theme', 'one-dark-pro'),
  'dracula-theme.theme-dracula': createThemeRuntime('dracula-theme.theme-dracula', 'dracula'),
  'enkia.tokyo-night': createThemeRuntime('enkia.tokyo-night', 'tokyo-night'),
  'catppuccin.catppuccin-vsc': createThemeRuntime('catppuccin.catppuccin-vsc', 'catppuccin-mocha'),
  'github.github-vscode-theme': createThemeRuntime('github.github-vscode-theme', 'github-dark'),
  'sdras.night-owl': createThemeRuntime('sdras.night-owl', 'night-owl'),
  'monokai.theme-monokai-pro-vscode': createThemeRuntime('monokai.theme-monokai-pro-vscode', 'monokai-pro'),
  'arcticicestudio.nord-visual-studio-code': createThemeRuntime('arcticicestudio.nord-visual-studio-code', 'nord'),
  'robbowen.synthwave-vscode': createThemeRuntime('robbowen.synthwave-vscode', 'synthwave-84'),
  'teabyii.ayu': createThemeRuntime('teabyii.ayu', 'ayu-dark'),
  'wesbos.theme-cobalt2': createThemeRuntime('wesbos.theme-cobalt2', 'cobalt2'),
  'jdinhlife.gruvbox': createThemeRuntime('jdinhlife.gruvbox', 'gruvbox-dark'),
  'ahmadawais.shades-of-purple': createThemeRuntime('ahmadawais.shades-of-purple', 'shades-of-purple'),
  'mvllow.rose-pine': createThemeRuntime('mvllow.rose-pine', 'rose-pine'),

  // Icons
  'material-icons': createIconThemeRuntime('material-icons', 'material-icons'),
  'pkief.material-icon-theme': createIconThemeRuntime('pkief.material-icon-theme', 'material-icons'),
  'emmanuelbeziat.vscode-great-icons': createIconThemeRuntime('emmanuelbeziat.vscode-great-icons', 'great-icons'),
  'miguelsolorio.fluent-icons': createIconThemeRuntime('miguelsolorio.fluent-icons', 'fluent-icons'),
  'vscode-icons-team.vscode-icons': createIconThemeRuntime('vscode-icons-team.vscode-icons', 'vscode-icons'),
};

export default themeExtensions;
