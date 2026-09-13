import { EditorExtensionRuntime } from '@/types/extension';
import {
  reactSnippets,
  nextjsSnippets,
  vueSnippets,
  tailwindSnippets,
  pythonSnippets,
  htmlSnippets,
  testSnippets,
} from './snippetDefinitions';

export const snippetExtensions: Record<string, EditorExtensionRuntime> = {
  // ES7+ React/Redux Snippets
  'dsznajder.es7-react-js-snippets': {
    id: 'dsznajder.es7-react-js-snippets',
    activate: (editorApi) => {
      editorApi.registerSnippets?.('javascript', reactSnippets);
      editorApi.registerSnippets?.('typescript', reactSnippets);
      editorApi.registerSnippets?.('javascriptreact', reactSnippets);
      editorApi.registerSnippets?.('typescriptreact', reactSnippets);
      editorApi.showToast?.('ES7+ React/Redux snippets active', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterSnippets?.('javascript');
      editorApi.unregisterSnippets?.('typescript');
    },
  },

  // Simple React Snippets
  'burkeholland.simple-react-snippets': {
    id: 'burkeholland.simple-react-snippets',
    activate: (editorApi) => {
      editorApi.registerSnippets?.('javascript', reactSnippets);
      editorApi.registerSnippets?.('typescript', reactSnippets);
      editorApi.showToast?.('Simple React snippets active', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterSnippets?.('javascript');
      editorApi.unregisterSnippets?.('typescript');
    },
  },

  // Next.js Snippets
  'pulkitgangwar.nextjs-snippets': {
    id: 'pulkitgangwar.nextjs-snippets',
    activate: (editorApi) => {
      editorApi.registerSnippets?.('javascript', nextjsSnippets);
      editorApi.registerSnippets?.('typescript', nextjsSnippets);
      editorApi.showToast?.('Next.js snippets active', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterSnippets?.('javascript');
      editorApi.unregisterSnippets?.('typescript');
    },
  },

  // Vue Snippets
  'sdras.vue-vscode-snippets': {
    id: 'sdras.vue-vscode-snippets',
    activate: (editorApi) => {
      editorApi.registerSnippets?.('vue', vueSnippets);
      editorApi.registerSnippets?.('html', vueSnippets);
      editorApi.showToast?.('Vue snippets active', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterSnippets?.('vue');
    },
  },

  // Tailwind CSS Snippets
  'bradlc.vscode-tailwindcss': {
    id: 'bradlc.vscode-tailwindcss',
    activate: (editorApi) => {
      editorApi.registerSnippets?.('css', tailwindSnippets);
      editorApi.registerSnippets?.('html', tailwindSnippets);
      editorApi.registerSnippets?.('javascript', tailwindSnippets);
      editorApi.registerSnippets?.('typescript', tailwindSnippets);
      editorApi.showToast?.('Tailwind CSS IntelliSense snippets active', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterSnippets?.('css');
    },
  },

  // Python Snippets
  'cstrap.python-snippets': {
    id: 'cstrap.python-snippets',
    activate: (editorApi) => {
      editorApi.registerSnippets?.('python', pythonSnippets);
      editorApi.showToast?.('Python snippets active', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterSnippets?.('python');
    },
  },

  // HTML Snippets
  'formulahendry.auto-complete-tag': {
    id: 'formulahendry.auto-complete-tag',
    activate: (editorApi) => {
      editorApi.registerSnippets?.('html', htmlSnippets);
      editorApi.showToast?.('HTML snippets active', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterSnippets?.('html');
    },
  },

  // Testing Snippets
  'orta.vscode-jest': {
    id: 'orta.vscode-jest',
    activate: (editorApi) => {
      editorApi.registerSnippets?.('javascript', testSnippets);
      editorApi.registerSnippets?.('typescript', testSnippets);
      editorApi.showToast?.('Jest / Vitest snippets active', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterSnippets?.('javascript');
      editorApi.unregisterSnippets?.('typescript');
    },
  },
};

export default snippetExtensions;
