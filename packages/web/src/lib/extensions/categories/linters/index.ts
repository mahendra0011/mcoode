import { EditorExtensionRuntime } from '@/types/extension';
import {
  lintWithEslint,
  lintCss,
  lintHtml,
  lintJson,
  lintMarkdown,
} from './linterRules';

export const linterExtensions: Record<string, EditorExtensionRuntime> = {
  // ESLint
  'eslint': {
    id: 'eslint',
    activate: (editorApi) => {
      editorApi.registerLinter?.((code: string) => {
        return lintWithEslint(code);
      });
      editorApi.showToast?.('ESLint activated', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterLinter?.();
    },
  },

  'dbaeumer.vscode-eslint': {
    id: 'dbaeumer.vscode-eslint',
    activate: (editorApi) => {
      editorApi.registerLinter?.((code: string) => {
        return lintWithEslint(code);
      });
      editorApi.showToast?.('ESLint VS Code extension activated', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterLinter?.();
    },
  },

  // Stylelint
  'stylelint.vscode-stylelint': {
    id: 'stylelint.vscode-stylelint',
    activate: (editorApi) => {
      editorApi.registerLinter?.((code: string) => {
        return lintCss(code);
      });
      editorApi.showToast?.('Stylelint activated', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterLinter?.();
    },
  },

  // HTMLHint
  'htmlhint.vscode-htmlhint': {
    id: 'htmlhint.vscode-htmlhint',
    activate: (editorApi) => {
      editorApi.registerLinter?.((code: string) => {
        return lintHtml(code);
      });
      editorApi.showToast?.('HTMLHint activated', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterLinter?.();
    },
  },

  // JSONLint / JSON Tools
  'eriklynd.json-tools': {
    id: 'eriklynd.json-tools',
    activate: (editorApi) => {
      editorApi.registerLinter?.((code: string) => {
        return lintJson(code);
      });
      editorApi.showToast?.('JSON Tools & Lint activated', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterLinter?.();
    },
  },

  // Markdownlint
  'davidanson.vscode-markdownlint': {
    id: 'davidanson.vscode-markdownlint',
    activate: (editorApi) => {
      editorApi.registerLinter?.((code: string) => {
        return lintMarkdown(code);
      });
      editorApi.showToast?.('Markdownlint activated', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterLinter?.();
    },
  },

  // SonarLint
  'sonarsource.sonarlint-vscode': {
    id: 'sonarsource.sonarlint-vscode',
    activate: (editorApi) => {
      editorApi.registerLinter?.((code: string) => {
        return lintWithEslint(code);
      });
      editorApi.showToast?.('SonarLint code quality checks activated', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterLinter?.();
    },
  },
};

export default linterExtensions;
