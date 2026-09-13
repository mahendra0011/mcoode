"use client";
import { useState, useCallback } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandItem,
  CommandGroup,
} from "cmdk";
import { useIDEStore } from "../../store/ideStore";
import { MessageSquare, Code, Terminal, Settings, Zap, Sliders, Settings2 } from "lucide-react";

interface NavItem {
  label: string;
  icon: ReactNode;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "AI Chat", icon: <MessageSquare className="w-4 h-4" />, href: "/ai/chat" },
  { label: "Landing", icon: <Code className="w-4 h-4" />, href: "/" },
  { label: "CLI", icon: <Terminal className="w-4 h-4" />, href: "/cli" },
  { label: "Settings", icon: <Settings className="w-4 h-4" />, href: "/settings" },
];

/**
 * Command palette (cmdk).
 *
 * Mounted globally in Providers; its open state + navigation live in the Zustand
 * IDE store so the palette can be toggled from GlobalShortcuts (Cmd/Ctrl+K and
 * Cmd/Ctrl+Shift+P) as well as programmatically. Navigation is client-side via
 * next/navigation's useRouter — no page refresh.
 */
export function CommandPalette() {
  const router = useRouter();
  const open = useIDEStore((s) => s.isCommandPaletteOpen);
  const setOpen = useIDEStore((s) => s.setCommandPaletteOpen);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [setOpen, router]
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandGroup heading="Preferences & Settings">
          <CommandItem
            onSelect={() => {
              setOpen(false);
              useIDEStore.getState().openSettings('models');
            }}
            className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer"
          >
            <Settings className="w-4 h-4 text-emerald-400" />
            <span>Preferences: Open Platform Settings</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setOpen(false);
              useIDEStore.getState().setQuickSettingsOpen(true);
            }}
            className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer"
          >
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>Preferences: AI Quick Settings</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setOpen(false);
              useIDEStore.getState().setAdvancedSettingsOpen(true);
            }}
            className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-blue-400" />
            <span>Preferences: Advanced Monaco & Diff Settings</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setOpen(false);
              useIDEStore.getState().setGeneralSettingsOpen(true);
            }}
            className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer"
          >
            <Settings2 className="w-4 h-4 text-purple-400" />
            <span>Preferences: Mcode IDE General Settings</span>
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Navigate">
          {NAV_ITEMS.map((n) => (
            <CommandItem
              key={n.href}
              onSelect={() => go(n.href)}
              className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer"
            >
              {n.icon}
              <span>{n.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export default CommandPalette;
