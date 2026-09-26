"use client";
import { useState, useCallback } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandGroup,
} from "cmdk";
import { useIDEStore } from "../../store/ideStore";
import { useI18n } from "../../lib/i18n";
import { MessageSquare, Code, Terminal, Settings, Zap, Sliders, Settings2 } from "lucide-react";

interface NavItem {
  label: string;
  icon: ReactNode;
  href: string;
}

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
  const { t } = useI18n();

  const NAV_ITEMS: NavItem[] = [
    { label: t('palette.aiChat'), icon: <MessageSquare className="w-4 h-4" />, href: "/ai/chat" },
    { label: "AI Home", icon: <Zap className="w-4 h-4" />, href: "/ai" },
    { label: t('palette.landing'), icon: <Code className="w-4 h-4" />, href: "/" },
    { label: t('palette.cli'), icon: <Terminal className="w-4 h-4" />, href: "/cli" },
    { label: "Mcode Dashboard", icon: <MessageSquare className="w-4 h-4" />, href: "/mcode" },
    { label: "Extensions", icon: <Code className="w-4 h-4" />, href: "/extensions" },
    { label: "Tools (search/ports/watch)", icon: <Zap className="w-4 h-4" />, href: "/tools" },
    { label: "Live monitor", icon: <Zap className="w-4 h-4" />, href: "/live" },
    { label: "Sessions", icon: <MessageSquare className="w-4 h-4" />, href: "/sessions" },
    { label: "Plugins", icon: <Code className="w-4 h-4" />, href: "/plugins" },
    { label: "Docs", icon: <Code className="w-4 h-4" />, href: "/docs" },
    { label: "Commands", icon: <Terminal className="w-4 h-4" />, href: "/commands" },
    { label: "Changelog", icon: <Settings className="w-4 h-4" />, href: "/changelog" },
    { label: "Preview", icon: <Code className="w-4 h-4" />, href: "/preview" },
    { label: "Login", icon: <Settings className="w-4 h-4" />, href: "/login" },
    { label: "Signup", icon: <Settings className="w-4 h-4" />, href: "/signup" },
    { label: t('palette.settings'), icon: <Settings className="w-4 h-4" />, href: "/settings" },
  ];

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [setOpen, router]
  );

  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label="Command palette">
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
    </Command.Dialog>
  );
}

export default CommandPalette;
