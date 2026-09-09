"use client";
import { Provider } from "react-redux";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { store } from "../store";
import api from "../lib/axios";
import { Toaster } from "sonner";
import { CommandPalette } from "../components/ui/CommandPalette";
import { GlobalShortcuts } from "../components/ui/GlobalShortcuts";
import { ShortcutsDialog } from "../components/ui/ShortcutsDialog";

// Replicates the theme-accent load that lived in the vite-era App.jsx.
const THEMES: Record<string, string> = {
  emerald: "#10b981",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  amber: "#f59e0b",
  red: "#ef4444",
  teal: "#14b8a6",
};

// Single shared React Query client for the whole app.
const queryClient = new QueryClient();

export default function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    try {
      const tokens = JSON.parse(localStorage.getItem("mcode_tokens") || "{}");
      if (tokens?.access) {
        api.get("/api/v1/settings", { timeout: 5000 })
          .then((res) => {
            const d = res.data;
            if (d?.settings?.accentColor && THEMES[d.settings.accentColor]) {
              document.documentElement.style.setProperty(
                "--theme-accent",
                THEMES[d.settings.accentColor]
              );
            }
          })
          .catch(() => {});
      }
    } catch {
      // no tokens / not in browser on initial mount
    }
  }, []);

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        {/* Global toast host (sonner) — available to all routes */}
        <Toaster position="top-right" closeButton richColors />
        {/* Global VS Code-style keyboard shortcuts */}
        <GlobalShortcuts />
        {/* Cmd/Ctrl+/ cheat sheet */}
        <ShortcutsDialog />
        {/* Global Cmd+K command palette */}
        <CommandPalette />
        {children}
      </QueryClientProvider>
    </Provider>
  );
}
