import { EditorExtensionRuntime } from '@/types/extension';
import { setupGitLineBlame } from './gitFeatures';

export const gitExtensions: Record<string, EditorExtensionRuntime> = {
  // GitLens
  'eamodio.gitlens': {
    id: 'eamodio.gitlens',
    activate: (editorApi) => {
      editorApi.registerDecorator?.('gitlens-blame', (editor: any, monaco: any) => {
        return setupGitLineBlame(editor, monaco);
      });
      editorApi.showToast?.('GitLens activated (Line Blame & VCS History)', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterDecorator?.('gitlens-blame');
    },
  },

  // Git Graph
  'mhutchie.git-graph': {
    id: 'mhutchie.git-graph',
    activate: (editorApi) => {
      editorApi.showToast?.('Git Graph view integrated with Source Control', 'success');
    },
    deactivate: () => {},
  },

  // Git History
  'donjayamanne.githistory': {
    id: 'donjayamanne.githistory',
    activate: (editorApi) => {
      editorApi.showToast?.('Git History viewer activated', 'success');
    },
    deactivate: () => {},
  },

  // Conventional Commits
  'vivaxy.vscode-conventional-commits': {
    id: 'vivaxy.vscode-conventional-commits',
    activate: (editorApi) => {
      editorApi.showToast?.('Conventional Commits prompt helper enabled', 'success');
    },
    deactivate: () => {},
  },
};

export default gitExtensions;
