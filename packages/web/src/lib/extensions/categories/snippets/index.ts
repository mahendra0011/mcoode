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

// NOTE (746): activate/deactivate pass the extension id as the snippet
// owner, so disabling one pack only disposes ITS providers — never the
// whole language (which would also kill other packs' snippets).
export const snippetExtensions: Record<string, EditorExtensionRuntime> = {
  // ES7+ React/Redux Snippets
  'dsznajder.es7-react-js-snippets': {
    id: 'dsznajder.es7-react-js-snippets',
    activate: (editorApi) => {
      editorApi.registerSnippets?.('javascript', reactSnippets, 'dsznajder.es7-react-js-snippets');
      editorApi.registerSnippets?.('typescript', reactSnippets, 'dsznajder.es7-react-js-snippets');
      editorApi.registerSnippets?.('javascriptreact', reactSnippets, 'dsznajder.es7-react-js-snippets');
      editorApi.registerSnippets?.('typescriptreact', reactSnippets, 'dsznajder.es7-react-js-snippets');
      editorApi.showToast?.('ES7+ React/Redux snippets active', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterSnippets?.('javascript', 'dsznajder.es7-react-js-snippets');
      editorApi.unregisterSnippets?.('typescript', 'dsznajder.es7-react-js-snippets');
    },
  },

  // Simple React Snippets
  'burkeholland.simple-react-snippets': {
    id: 'burkeholland.simple-react-snippets',
    activate: (editorApi) => {
      editorApi.registerSnippets?.('javascript', reactSnippets, 'burkeholland.simple-react-snippets');
      editorApi.registerSnippets?.('typescript', reactSnippets, 'burkeholland.simple-react-snippets');
      editorApi.showToast?.('Simple React snippets active', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterSnippets?.('javascript', 'burkeholland.simple-react-snippets');
      editorApi.unregisterSnippets?.('typescript', 'burkeholland.simple-react-snippets');
    },
  },

  // Next.js Snippets
  'pulkitgangwar.nextjs-snippets': {
    id: 'pulkitgangwar.nextjs-snippets',
    activate: (editorApi) => {
      editorApi.registerSnippets?.('javascript', nextjsSnippets, 'pulkitgangwar.nextjs-snippets');
      editorApi.registerSnippets?.('typescript', nextjsSnippets, 'pulkitgangwar.nextjs-snippets');
      editorApi.showToast?.('Next.js snippets active', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterSnippets?.('javascript', 'pulkitgangwar.nextjs-snippets');
      editorApi.unregisterSnippets?.('typescript', 'pulkitgangwar.nextjs-snippets');
    },
  },

  // Vue Snippets
  'sdras.vue-vscode-snippets': {
    id: 'sdras.vue-vscode-snippets',
    activate: (editorApi) => {
      editorApi.registerSnippets?.('vue', vueSnippets, 'sdras.vue-vscode-snippets');
      editorApi.registerSnippets?.('html', vueSnippets, 'sdras.vue-vscode-snippets');
      editorApi.showToast?.('Vue snippets active', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterSnippets?.('vue', 'sdras.vue-vscode-snippets');
    },
  },

  // Tailwind CSS Snippets
  'bradlc.vscode-tailwindcss': {
    id: 'bradlc.vscode-tailwindcss',
    activate: (editorApi) => {
      editorApi.registerSnippets?.('css', tailwindSnippets, 'bradlc.vscode-tailwindcss');
      editorApi.registerSnippets?.('html', tailwindSnippets, 'bradlc.vscode-tailwindcss');
      editorApi.registerSnippets?.('javascript', tailwindSnippets, 'bradlc.vscode-tailwindcss');
      editorApi.registerSnippets?.('typescript', tailwindSnippets, 'bradlc.vscode-tailwindcss');
      editorApi.showToast?.('Tailwind CSS IntelliSense snippets active', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterSnippets?.('css', 'bradlc.vscode-tailwindcss');
    },
  },

  // Python Snippets
  'cstrap.python-snippets': {
    id: 'cstrap.python-snippets',
    activate: (editorApi) => {
      editorApi.registerSnippets?.('python', pythonSnippets, 'cstrap.python-snippets');
      editorApi.showToast?.('Python snippets active', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterSnippets?.('python', 'cstrap.python-snippets');
    },
  },

  // HTML Snippets
  'formulahendry.auto-complete-tag': {
    id: 'formulahendry.auto-complete-tag',
    activate: (editorApi) => {
      editorApi.registerSnippets?.('html', htmlSnippets, 'formulahendry.auto-complete-tag');
      editorApi.showToast?.('HTML snippets active', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterSnippets?.('html', 'formulahendry.auto-complete-tag');
    },
  },

  // Testing Snippets
  'orta.vscode-jest': {
    id: 'orta.vscode-jest',
    activate: (editorApi) => {
      editorApi.registerSnippets?.('javascript', testSnippets, 'orta.vscode-jest');
      editorApi.registerSnippets?.('typescript', testSnippets, 'orta.vscode-jest');
      editorApi.showToast?.('Jest / Vitest snippets active', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterSnippets?.('javascript', 'orta.vscode-jest');
      editorApi.unregisterSnippets?.('typescript', 'orta.vscode-jest');
    },
  },
};

export default snippetExtensions;
