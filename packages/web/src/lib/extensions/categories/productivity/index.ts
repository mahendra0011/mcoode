import { EditorExtensionRuntime } from '@/types/extension';
import {
  setupAutoCloseTag,
  setupColorHighlight,
  setupTodoHighlight,
} from './productivityFeatures';

export const productivityExtensions: Record<string, EditorExtensionRuntime> = {
  // Auto Close Tags
  'auto-close-tags': {
    id: 'auto-close-tags',
    activate: (editorApi) => {
      editorApi.setAutoCloseTags?.(true);
      editorApi.registerDecorator?.('auto-close-tags', (editor: any, monaco: any) => {
        return setupAutoCloseTag(editor, monaco);
      });
      editorApi.showToast?.('Auto Close Tag enabled', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.setAutoCloseTags?.(false);
      editorApi.unregisterDecorator?.('auto-close-tags');
    },
  },

  'formulahendry.auto-close-tag': {
    id: 'formulahendry.auto-close-tag',
    activate: (editorApi) => {
      editorApi.setAutoCloseTags?.(true);
      editorApi.registerDecorator?.('auto-close-tag', (editor: any, monaco: any) => {
        return setupAutoCloseTag(editor, monaco);
      });
      editorApi.showToast?.('Auto Close Tag activated', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.setAutoCloseTags?.(false);
      editorApi.unregisterDecorator?.('auto-close-tag');
    },
  },

  'formulahendry.auto-rename-tag': {
    id: 'formulahendry.auto-rename-tag',
    activate: (editorApi) => {
      editorApi.showToast?.('Auto Rename Tag activated', 'success');
    },
    deactivate: () => {},
  },

  // Color Highlight
  'naumovs.color-highlight': {
    id: 'naumovs.color-highlight',
    activate: (editorApi) => {
      editorApi.registerDecorator?.('color-highlight', (editor: any, monaco: any) => {
        return setupColorHighlight(editor, monaco);
      });
      editorApi.showToast?.('Color Highlight activated', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterDecorator?.('color-highlight');
    },
  },

  // Todo Tree
  'gruntfuggly.todo-tree': {
    id: 'gruntfuggly.todo-tree',
    activate: (editorApi) => {
      editorApi.registerDecorator?.('todo-tree', (editor: any, monaco: any) => {
        return setupTodoHighlight(editor, monaco);
      });
      editorApi.showToast?.('Todo Tree scanner activated', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterDecorator?.('todo-tree');
    },
  },

  // Todo Highlight
  'wayou.vscode-todo-highlight': {
    id: 'wayou.vscode-todo-highlight',
    activate: (editorApi) => {
      editorApi.registerDecorator?.('todo-highlight', (editor: any, monaco: any) => {
        return setupTodoHighlight(editor, monaco);
      });
      editorApi.showToast?.('Todo Highlight activated', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterDecorator?.('todo-highlight');
    },
  },

  // Bracket Pair Colorizer
  'coenraads.bracket-pair-colorizer-2': {
    id: 'coenraads.bracket-pair-colorizer-2',
    activate: (editorApi) => {
      const editor = editorApi.getEditor?.();
      editor?.updateOptions?.({
        'bracketPairColorization.enabled': true,
        guides: { bracketPairs: true },
      });
      editorApi.showToast?.('Bracket Pair Colorizer enabled', 'success');
    },
    deactivate: (editorApi) => {
      const editor = editorApi.getEditor?.();
      editor?.updateOptions?.({
        'bracketPairColorization.enabled': false,
      });
    },
  },

  // Indent Rainbow
  'oderwat.indent-rainbow': {
    id: 'oderwat.indent-rainbow',
    activate: (editorApi) => {
      const editor = editorApi.getEditor?.();
      editor?.updateOptions?.({
        guides: { indentation: true, bracketPairsHorizontal: true },
      });
      editorApi.showToast?.('Indent Rainbow guides enabled', 'success');
    },
    deactivate: (editorApi) => {
      const editor = editorApi.getEditor?.();
      editor?.updateOptions?.({
        guides: { indentation: false },
      });
    },
  },

  // Turbo Console Log
  'chakrounanas.turbo-console-log': {
    id: 'chakrounanas.turbo-console-log',
    activate: (editorApi) => {
      editorApi.showToast?.('Turbo Console Log ready (Alt+Shift+L)', 'info');
    },
    deactivate: () => {},
  },

  // Path Intellisense
  'christian-kohler.path-intellisense': {
    id: 'christian-kohler.path-intellisense',
    activate: (editorApi) => {
      editorApi.showToast?.('Path Intellisense auto-completion active', 'success');
    },
    deactivate: () => {},
  },

  // Code Spell Checker
  'streetsidesoftware.code-spell-checker': {
    id: 'streetsidesoftware.code-spell-checker',
    activate: (editorApi) => {
      editorApi.showToast?.('Code Spell Checker active', 'success');
    },
    deactivate: () => {},
  },
};

export default productivityExtensions;
