import { EditorExtensionRuntime } from '@/types/extension';
import {
  formatWithPrettier,
  formatSql,
  formatXmlOrSvg,
  formatPythonBlack,
  formatClang,
} from './formatterRules';

export const formatterExtensions: Record<string, EditorExtensionRuntime> = {
  // Prettier
  'prettier': {
    id: 'prettier',
    activate: async (editorApi) => {
      editorApi.registerFormatter?.(async (code: string) => {
        return formatWithPrettier(code, 'babel');
      });
      editorApi.showToast?.('Prettier Formatter activated', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterFormatter?.();
    },
  },

  'esbenp.prettier-vscode': {
    id: 'esbenp.prettier-vscode',
    activate: async (editorApi) => {
      editorApi.registerFormatter?.(async (code: string) => {
        return formatWithPrettier(code, 'babel');
      });
      editorApi.showToast?.('Prettier Code Formatter activated', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterFormatter?.();
    },
  },

  // Biome
  'biomejs.biome': {
    id: 'biomejs.biome',
    activate: (editorApi) => {
      editorApi.registerFormatter?.(async (code: string) => {
        return formatWithPrettier(code, 'babel');
      });
      editorApi.showToast?.('Biome Formatter activated', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterFormatter?.();
    },
  },

  // Beautify
  'hookyqr.beautify': {
    id: 'hookyqr.beautify',
    activate: (editorApi) => {
      editorApi.registerFormatter?.(async (code: string) => {
        return formatWithPrettier(code, 'babel');
      });
      editorApi.showToast?.('Beautify activated', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterFormatter?.();
    },
  },

  // Black Formatter (Python)
  'ms-python.black-formatter': {
    id: 'ms-python.black-formatter',
    activate: (editorApi) => {
      editorApi.registerFormatter?.((code: string) => {
        return formatPythonBlack(code);
      });
      editorApi.showToast?.('Black Formatter activated', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterFormatter?.();
    },
  },

  // Clang-Format
  'xaver.clang-format': {
    id: 'xaver.clang-format',
    activate: (editorApi) => {
      editorApi.registerFormatter?.((code: string) => {
        return formatClang(code);
      });
      editorApi.showToast?.('Clang-Format activated', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterFormatter?.();
    },
  },

  // SQL Formatter
  'mtxr.sqltools': {
    id: 'mtxr.sqltools',
    activate: (editorApi) => {
      editorApi.registerFormatter?.((code: string) => {
        return formatSql(code);
      });
      editorApi.showToast?.('SQLTools Formatter activated', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterFormatter?.();
    },
  },

  // XML / SVG Formatter
  'redhat.vscode-xml': {
    id: 'redhat.vscode-xml',
    activate: (editorApi) => {
      editorApi.registerFormatter?.((code: string) => {
        return formatXmlOrSvg(code);
      });
      editorApi.showToast?.('XML Formatter activated', 'success');
    },
    deactivate: (editorApi) => {
      editorApi.unregisterFormatter?.();
    },
  },
};

export default formatterExtensions;
