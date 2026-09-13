import { EditorExtensionRuntime } from '@/types/extension';

export const databaseExtensions: Record<string, EditorExtensionRuntime> = {
  // Prisma
  'prisma.prisma': {
    id: 'prisma.prisma',
    activate: (editorApi) => {
      editorApi.showToast?.('Prisma schema language support enabled', 'success');
    },
    deactivate: () => {},
  },

  // SQLite Viewer
  'qwtel.sqlite-viewer': {
    id: 'qwtel.sqlite-viewer',
    activate: (editorApi) => {
      editorApi.showToast?.('SQLite Viewer ready for .db and .sqlite files', 'success');
    },
    deactivate: () => {},
  },

  // MongoDB
  'mongodb.mongodb-vscode': {
    id: 'mongodb.mongodb-vscode',
    activate: (editorApi) => {
      editorApi.showToast?.('MongoDB for VS Code connected', 'success');
    },
    deactivate: () => {},
  },

  // Database Client
  'cweijan.vscode-database-client2': {
    id: 'cweijan.vscode-database-client2',
    activate: (editorApi) => {
      editorApi.showToast?.('Database Client (MySQL/PostgreSQL/Redis) active', 'success');
    },
    deactivate: () => {},
  },
};

export default databaseExtensions;
