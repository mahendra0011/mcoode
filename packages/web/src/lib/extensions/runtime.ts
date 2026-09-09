import { EditorExtensionRuntime } from "@/types/extension";

/**
 * Each extension's real behavior plugs in here.
 * editorApi is whatever your editor (Monaco, CodeMirror, etc.) exposes —
 * e.g. { registerFormatter, unregisterFormatter, setTheme, registerLinter, ... }
 *
 * Nothing here downloads anything at runtime — the packages these rely on
 * (prettier, eslint, etc.) are installed as normal npm deps and bundled at build time.
 */
export const runtime: Record<string, EditorExtensionRuntime> = {
  prettier: {
    id: "prettier",
    activate: async (editorApi) => {
      try {
        const prettier = await import("prettier/standalone");
        let plugins: any[] = [];
        try {
          const parserBabel = await import("prettier/plugins/babel");
          const parserEstree = await import("prettier/plugins/estree");
          plugins = [parserBabel.default || parserBabel, parserEstree.default || parserEstree];
        } catch {
          try {
            const parserBabel = await import("prettier/parser-babel" as any);
            plugins = [parserBabel.default || parserBabel];
          } catch {
            // fallback if plugin loading differs
          }
        }

        editorApi.registerFormatter?.(async (code: string) => {
          return prettier.format(code, {
            parser: "babel",
            plugins,
          });
        });
      } catch (e) {
        console.warn("Prettier activation error:", e);
      }
    },
    deactivate: (editorApi) => {
      editorApi.unregisterFormatter?.();
    },
  },

  eslint: {
    id: "eslint",
    activate: async (editorApi) => {
      // Swap for `eslint-linter-browserify` if you want real linting rules
      editorApi.registerLinter?.((code: string) => {
        // placeholder rule set — replace with real Linter().verify(...)
        const problems: any[] = [];
        if (code.includes("var ")) {
          problems.push({ message: "Use let/const instead of var", severity: "warning" });
        }
        return problems;
      });
    },
    deactivate: (editorApi) => {
      editorApi.unregisterLinter?.();
    },
  },

  "one-dark-theme": {
    id: "one-dark-theme",
    activate: (editorApi) => {
      editorApi.setTheme?.("one-dark-pro");
    },
    deactivate: (editorApi) => {
      editorApi.setTheme?.("default-dark");
    },
  },

  "material-icons": {
    id: "material-icons",
    activate: (editorApi) => {
      editorApi.setIconTheme?.("material-icons");
    },
    deactivate: (editorApi) => {
      editorApi.setIconTheme?.("default");
    },
  },

  "auto-close-tags": {
    id: "auto-close-tags",
    activate: (editorApi) => {
      editorApi.setAutoCloseTags?.(true);
    },
    deactivate: (editorApi) => {
      editorApi.setAutoCloseTags?.(false);
    },
  },
};
