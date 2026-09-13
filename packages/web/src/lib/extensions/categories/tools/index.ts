import { EditorExtensionRuntime } from '@/types/extension';
import { parseRestSnippet, triggerLiveServerPreview } from './toolFeatures';

export const toolExtensions: Record<string, EditorExtensionRuntime> = {
  // REST Client
  'humao.rest-client': {
    id: 'humao.rest-client',
    activate: (editorApi) => {
      editorApi.showToast?.('REST Client activated: send HTTP requests directly from .http files', 'success');
    },
    deactivate: () => {},
  },

  // Thunder Client
  'rangav.vscode-thunder-client': {
    id: 'rangav.vscode-thunder-client',
    activate: (editorApi) => {
      editorApi.showToast?.('Thunder Client API Testing client active', 'success');
    },
    deactivate: () => {},
  },

  // Live Server
  'ritwickdey.liveserver': {
    id: 'ritwickdey.liveserver',
    activate: (editorApi) => {
      const url = triggerLiveServerPreview();
      editorApi.showToast?.(`Live Server ready on port 5500`, 'success');
    },
    deactivate: () => {},
  },

  // Markdown Preview Enhanced
  'shd101wyy.markdown-preview-enhanced': {
    id: 'shd101wyy.markdown-preview-enhanced',
    activate: (editorApi) => {
      editorApi.showToast?.('Markdown Preview Enhanced activated', 'success');
    },
    deactivate: () => {},
  },

  // Draw.io
  'hediet.vscode-drawio': {
    id: 'hediet.vscode-drawio',
    activate: (editorApi) => {
      editorApi.showToast?.('Draw.io Diagram editor ready for .drawio files', 'success');
    },
    deactivate: () => {},
  },

  // CodeSnap
  'adpyke.codesnap': {
    id: 'adpyke.codesnap',
    activate: (editorApi) => {
      editorApi.showToast?.('CodeSnap ready to take beautiful code screenshots', 'success');
    },
    deactivate: () => {},
  },

  // SVG Preview
  'simonsiefke.svg-preview': {
    id: 'simonsiefke.svg-preview',
    activate: (editorApi) => {
      editorApi.showToast?.('SVG Interactive Preview active', 'success');
    },
    deactivate: () => {},
  },
};

export default toolExtensions;
