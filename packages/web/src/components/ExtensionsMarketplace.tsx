"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Download,
  Star,
  Check,
  ExternalLink,
  Copy,
  Sparkles,
  Palette,
  ShieldCheck,
  Zap,
  Wrench,
  Database,
  GitBranch,
  Terminal,
  LayoutGrid,
  List as ListIcon,
  Loader2,
  Filter,
  Layers,
  Tag,
  Info,
  FileCode,
  ArrowUpDown,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { catalog as staticCatalog, categories } from "@/lib/extensions/catalog";
import { runtime } from "@/lib/extensions/runtime";
import extensionInstaller, { InstalledExtension } from "@/lib/extensions/installer";
import api from "@/lib/axios";

const STORAGE_KEY = "activeExtensions";

const QUICK_TAGS = [
  "Python",
  "JavaScript",
  "Themes",
  "Dracula",
  "Prettier",
  "ESLint",
  "Tailwind",
  "Git",
  "Database",
  "Snippets",
];

const CATEGORY_ICON_MAP: Record<string, React.ReactNode> = {
  "All categories": <Layers className="w-4 h-4 text-indigo-400" />,
  Themes: <Palette className="w-4 h-4 text-purple-400" />,
  Linters: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
  Formatters: <Sparkles className="w-4 h-4 text-amber-400" />,
  Snippets: <Zap className="w-4 h-4 text-yellow-400" />,
  Productivity: <Terminal className="w-4 h-4 text-blue-400" />,
  "Git & VCS": <GitBranch className="w-4 h-4 text-orange-400" />,
  Databases: <Database className="w-4 h-4 text-cyan-400" />,
  "Testing & Debug": <Wrench className="w-4 h-4 text-rose-400" />,
};

export interface ExtensionsMarketplaceProps {
  editorApi?: any;
}

export default function ExtensionsMarketplace({ editorApi = {} }: ExtensionsMarketplaceProps) {
  // Navigation & View States
  const [activeTab, setActiveTab] = useState<"all" | "trending" | "top-rated" | "installed">("all");
  const [activeCategory, setActiveCategory] = useState("All categories");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"Downloads" | "Rating" | "Name" | "Relevance">("Relevance");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // Search States
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Extensions Data & Manager
  const [catalog, setCatalog] = useState<any[]>(staticCatalog);
  const [installedList, setInstalledList] = useState<InstalledExtension[]>([]);
  const [installingIds, setInstallingIds] = useState<Set<string>>(new Set());
  const [activeBuiltIn, setActiveBuiltIn] = useState<Record<string, boolean>>({});
  const [visibleCount, setVisibleCount] = useState(60);

  // Detail Modal State
  const [selectedExtension, setSelectedExtension] = useState<any | null>(null);
  const [modalTab, setModalTab] = useState<"overview" | "contributions" | "details">("overview");

  // Keyboard shortcut: Ctrl+K or / to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "/" && document.activeElement !== searchInputRef.current && !(e.target as HTMLElement).matches("input, textarea")) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 320);
    return () => clearTimeout(timer);
  }, [query]);

  // Subscribe to installed extensions
  useEffect(() => {
    extensionInstaller.init();
    const unsubInstalled = extensionInstaller.subscribeInstalled((list) => {
      setInstalledList(list);
    });
    const unsubInstalling = extensionInstaller.subscribeInstalling((set) => {
      setInstallingIds(set);
    });

    return () => {
      unsubInstalled();
      unsubInstalling();
    };
  }, []);

  const installedMap = useMemo(() => {
    const map = new Map<string, InstalledExtension>();
    for (const ext of installedList) {
      map.set(ext.id, ext);
    }
    return map;
  }, [installedList]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { "All categories": catalog.length };
    catalog.forEach((ext) => {
      if (ext.category) {
        counts[ext.category] = (counts[ext.category] || 0) + 1;
      }
    });
    return counts;
  }, [catalog]);

  // Live Open VSX search query
  useEffect(() => {
    if (!debouncedQuery && activeCategory === "All categories") {
      setCatalog(staticCatalog);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const catQuery = activeCategory !== "All categories" ? `&category=${encodeURIComponent(activeCategory)}` : "";
    api
      .get(`/api/v1/extensions/search?q=${encodeURIComponent(debouncedQuery)}${catQuery}`)
      .then((res) => {
        if (res.data?.extensions && res.data.extensions.length > 0) {
          const map = new Map<string, any>();
          staticCatalog.forEach((e) => map.set(e.id, e));
          res.data.extensions.forEach((e: any) => {
            map.set(e.id, {
              ...e,
              category: activeCategory !== "All categories" ? activeCategory : e.category || "Tools",
              iconBg: "#1e222d",
            });
          });
          setCatalog(Array.from(map.values()));
        }
      })
      .catch((err) => {
        console.warn("[marketplace] Search error:", err);
      })
      .finally(() => {
        setIsSearching(false);
      });
  }, [debouncedQuery, activeCategory]);

  // Restore built-in active extensions from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      setActiveBuiltIn(saved);
      Object.entries(saved).forEach(([id, isOn]) => {
        if (isOn) runtime[id]?.activate(editorApi);
      });
    } catch (e) {
      console.error("Failed to restore extensions:", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleBuiltIn(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    const turningOn = !activeBuiltIn[id];
    if (turningOn) runtime[id]?.activate(editorApi);
    else runtime[id]?.deactivate(editorApi);

    const next = { ...activeBuiltIn, [id]: turningOn };
    setActiveBuiltIn(next);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error("Failed to save extensions state:", e);
      }
    }
  }

  async function handleInstall(ext: any, e?: React.MouseEvent) {
    e?.stopPropagation();
    toast.loading(`Downloading & installing ${ext.name}...`, { id: ext.id });
    const success = await extensionInstaller.install({
      id: ext.id,
      name: ext.name,
      version: ext.version,
      downloadUrl: ext.downloadUrl,
    });
    if (success) {
      toast.success(`${ext.name} installed successfully!`, { id: ext.id });
    } else {
      toast.error(`Failed to install ${ext.name}. Check backend logs.`, { id: ext.id });
    }
  }

  async function handleUninstall(id: string, name: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    toast.loading(`Uninstalling ${name}...`, { id });
    const success = await extensionInstaller.uninstall(id);
    if (success) {
      toast.success(`${name} uninstalled.`, { id });
    } else {
      toast.error(`Failed to uninstall ${name}.`, { id });
    }
  }

  function handleApplyTheme(themeId: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    extensionInstaller.applyTheme(themeId);
    toast.success(`Theme "${themeId}" applied to editor!`);
  }

  function handleCopyId(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    navigator.clipboard.writeText(id);
    toast.info(`Copied "${id}" to clipboard`);
  }

  // Filtered & Sorted list
  const filtered = useMemo(() => {
    let list = catalog;

    // Filter by Tab
    if (activeTab === "installed") {
      const installedIds = new Set(installedList.map((e) => e.id));
      list = list.filter((ext) => installedIds.has(ext.id));
    } else if (activeTab === "trending") {
      list = [...list].sort((a, b) => parseDownloads(b.downloads) - parseDownloads(a.downloads)).slice(0, 100);
    } else if (activeTab === "top-rated") {
      list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 100);
    }

    // Filter by Category
    if (activeCategory && activeCategory !== "All categories") {
      list = list.filter((ext) => ext.category === activeCategory);
    }

    // Filter by Verified
    if (verifiedOnly) {
      list = list.filter((ext) => ext.verified);
    }

    // Filter by Query
    if (debouncedQuery && debouncedQuery.trim()) {
      const q = debouncedQuery.trim().toLowerCase();
      list = list.filter(
        (ext) =>
          ext.name.toLowerCase().includes(q) ||
          ext.description?.toLowerCase().includes(q) ||
          ext.publisher?.toLowerCase().includes(q) ||
          ext.id.toLowerCase().includes(q)
      );
    }

    // Sorting
    switch (sortBy) {
      case "Downloads":
        list = [...list].sort((a, b) => parseDownloads(b.downloads) - parseDownloads(a.downloads));
        break;
      case "Rating":
        list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "Name":
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return list;
  }, [catalog, activeTab, activeCategory, verifiedOnly, debouncedQuery, sortBy, installedList]);

  const displayed = useMemo(() => {
    return filtered.slice(0, visibleCount);
  }, [filtered, visibleCount]);

  return (
    <div className="flex h-full w-full bg-[#0d0f14] text-[#e2e8f0] font-sans antialiased select-none overflow-hidden">
      {/* ─── LEFT SIDEBAR: CATEGORIES & STATS ─── */}
      <aside className="w-64 border-r border-[#1e2330] bg-[#11141c] flex flex-col justify-between p-4 shrink-0 overflow-y-auto custom-scrollbar">
        <div>
          {/* Marketplace Title */}
          <div className="flex items-center gap-2.5 px-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                Open VSX Registry
              </div>
              <div className="text-[11px] text-gray-400 font-medium">Free & Open Marketplace</div>
            </div>
          </div>

          {/* Categories Header */}
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Categories</span>
            {activeCategory !== "All categories" && (
              <button
                type="button"
                onClick={() => setActiveCategory("All categories")}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
              >
                <RotateCcw className="w-2.5 h-2.5" /> Reset
              </button>
            )}
          </div>

          {/* Category List */}
          <div className="space-y-1">
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              const count = categoryCounts[cat] || 0;
              const icon = CATEGORY_ICON_MAP[cat] || <Tag className="w-4 h-4 text-gray-400" />;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat);
                    setVisibleCount(60);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm"
                      : "text-gray-300 hover:bg-[#1a1f2c] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {icon}
                    <span className="truncate">{cat}</span>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isActive ? "bg-indigo-500/30 text-indigo-200" : "bg-[#1e2330] text-gray-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filters Divider */}
          <div className="my-5 border-t border-[#1e2330]" />

          {/* Filter options */}
          <div className="px-2 space-y-2.5">
            <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Filters</span>
            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="rounded border-[#2d3748] bg-[#1a1f2c] text-indigo-500 focus:ring-indigo-400 focus:ring-offset-0"
              />
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                Verified publishers
              </span>
            </label>
          </div>
        </div>

        {/* Installed Summary Widget */}
        <div className="mt-6 pt-4 border-t border-[#1e2330]">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] font-semibold text-gray-400">INSTALLED</span>
            <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              {installedList.length} active
            </span>
          </div>
          {installedList.length > 0 ? (
            <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar">
              {installedList.slice(0, 5).map((inst) => (
                <div
                  key={inst.id}
                  onClick={() => setSelectedExtension(inst)}
                  className="flex items-center justify-between p-1.5 rounded text-[11px] text-gray-300 hover:bg-[#1a1f2c] cursor-pointer"
                >
                  <span className="truncate max-w-[150px]">{inst.name}</span>
                  <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                </div>
              ))}
              {installedList.length > 5 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("installed")}
                  className="w-full text-center text-[10px] text-indigo-400 hover:underline pt-1"
                >
                  View all {installedList.length} extensions →
                </button>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-gray-400 px-1 italic">No extensions installed yet</div>
          )}
        </div>
      </aside>

      {/* ─── MAIN CONTENT AREA ─── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#0d0f14]">
        {/* Top Navbar / Header */}
        <div className="border-b border-[#1e2330] bg-[#11141c]/80 backdrop-blur-md px-6 py-4 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 bg-[#161a24] p-1 rounded-xl border border-[#242b3d] shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "all"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Browse All
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("trending")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "trending"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                🔥 Trending
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("top-rated")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "top-rated"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                ⭐ Top Rated
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("installed")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === "installed"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                📦 Installed
                <span className="text-[10px] bg-black/30 px-1.5 py-0.2 rounded-full font-mono">
                  {installedList.length}
                </span>
              </button>
            </div>

            {/* View Switcher & Sorter */}
            <div className="flex items-center gap-3">
              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-[#161a24] border border-[#242b3d] text-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="Relevance">Relevance</option>
                  <option value="Downloads">Most Downloads</option>
                  <option value="Rating">Highest Rating</option>
                  <option value="Name">Name (A-Z)</option>
                </select>
              </div>

              {/* Grid / List Mode */}
              <div className="flex items-center bg-[#161a24] p-1 rounded-lg border border-[#242b3d]">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded ${viewMode === "grid" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded ${viewMode === "list" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}
                  title="List View"
                >
                  <ListIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Search Input Box */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search extensions, languages, linters, snippets from Open VSX..."
              className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-[#151923] border border-[#222736] text-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-14 text-gray-400 hover:text-gray-200 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="absolute right-3 flex items-center gap-1.5">
              {isSearching ? (
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
              ) : (
                <kbd className="text-[10px] font-mono text-gray-400 bg-[#1e2330] border border-[#2a3245] px-1.5 py-0.5 rounded shadow-sm">
                  Ctrl K
                </kbd>
              )}
            </div>
          </div>

          {/* Quick Filter Tags */}
          <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto custom-scrollbar pb-1">
            <span className="text-[10px] text-gray-400 uppercase font-semibold mr-1 shrink-0">Popular:</span>
            {QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setQuery(tag);
                }}
                className={`text-[11px] px-2.5 py-0.5 rounded-full transition-all shrink-0 border ${
                  query.toLowerCase() === tag.toLowerCase()
                    ? "bg-indigo-600/30 text-indigo-300 border-indigo-500/50"
                    : "bg-[#161a24] text-gray-400 border-[#222736] hover:text-gray-200 hover:border-gray-600"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* ─── EXTENSIONS GRID / LIST ─── */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {/* Results count banner */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs text-gray-400">
              Showing <span className="font-semibold text-gray-200">{displayed.length}</span> of{" "}
              <span className="font-semibold text-gray-200">{filtered.length}</span> extensions
              {activeCategory !== "All categories" && ` in ${activeCategory}`}
            </div>
          </div>

          {viewMode === "grid" ? (
            /* GRID VIEW - MAX 3 CARDS PER ROW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5">
              {displayed.map((ext) => {
                const isInstalled = installedMap.has(ext.id);
                const isInstalling = installingIds.has(ext.id);
                const installedData = installedMap.get(ext.id);
                const hasThemes = installedData?.contributes?.themes && installedData.contributes.themes.length > 0;
                const isBuiltIn = Boolean(runtime[ext.id]);

                return (
                  <motion.div
                    key={ext.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => setSelectedExtension(ext)}
                    className="group relative flex flex-col justify-between bg-[#13161f] hover:bg-[#171b26] border border-[#202534] hover:border-indigo-500/40 rounded-xl p-4 transition-all shadow-sm hover:shadow-lg hover:shadow-indigo-500/5 cursor-pointer"
                  >
                    <div>
                      {/* Top Row: Icon + Title + Version */}
                      <div className="flex items-start gap-3 mb-2.5">
                        <div
                          className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 border border-[#2a3245] shadow-sm overflow-hidden"
                          style={{ background: ext.iconBg || "#1a1f2c" }}
                        >
                          {typeof ext.icon === "string" && (ext.icon.startsWith("http") || ext.icon.startsWith("/")) ? (
                            <img
                              src={ext.icon}
                              alt={ext.name}
                              className="w-7 h-7 object-contain"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="text-xl">{ext.icon || "⚡"}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-100 group-hover:text-indigo-300 truncate transition-colors">
                            {ext.name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                            <span className="truncate max-w-[100px]">{ext.publisher}</span>
                            {ext.verified && (
                              <span title="Verified Publisher">
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              </span>
                            )}
                            <span className="text-[10px] text-gray-400 font-mono ml-auto">
                              v{ext.version || "1.0.0"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-3 min-h-[34px]">
                        {ext.description || "No description provided."}
                      </p>
                    </div>

                    <div>
                      {/* Stats & Category Pill */}
                      <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 pb-3 border-t border-[#1c2230]">
                        <span className="flex items-center gap-1 font-medium text-amber-400">
                          <Star className="w-3 h-3 fill-amber-400" />
                          {ext.rating ? Number(ext.rating).toFixed(1) : "5.0"}
                        </span>
                        <span className="flex items-center gap-1 text-gray-400">
                          <Download className="w-3 h-3" />
                          {formatDownloads(ext.downloads)}
                        </span>
                        <span className="text-[10px] bg-[#1a202c] text-gray-400 px-2 py-0.5 rounded-full border border-[#283144]">
                          {ext.category || "Tools"}
                        </span>
                      </div>

                      {/* Actions Bar */}
                      <div className="flex items-center gap-2 pt-1">
                        {isInstalling ? (
                          <button
                            type="button"
                            disabled
                            className="w-full py-1.5 rounded-lg bg-indigo-600/30 text-indigo-300 text-xs font-semibold flex items-center justify-center gap-2 cursor-wait border border-indigo-500/30"
                          >
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Installing...
                          </button>
                        ) : isInstalled ? (
                          <div className="flex items-center gap-2 w-full">
                            {hasThemes && (
                              <button
                                type="button"
                                onClick={(e) => handleApplyTheme(installedData!.contributes!.themes![0].id, e)}
                                className="flex-1 py-1.5 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors shadow-sm"
                              >
                                <Palette className="w-3 h-3" /> Apply
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => handleUninstall(ext.id, ext.name, e)}
                              className="flex-1 py-1.5 px-2 rounded-lg bg-[#222736] hover:bg-red-500/20 hover:text-red-300 text-gray-300 text-xs font-medium border border-[#2d3448] transition-colors"
                            >
                              Uninstall
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleInstall(ext, e)}
                            className="w-full py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" /> Install
                          </button>
                        )}

                        {/* Built-in Toggle button if built-in */}
                        {isBuiltIn && !isInstalled && (
                          <button
                            type="button"
                            onClick={(e) => toggleBuiltIn(ext.id, e)}
                            className={`p-1.5 rounded-lg border text-xs font-medium transition-all ${
                              activeBuiltIn[ext.id]
                                ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-300"
                                : "bg-[#1e2330] border-[#2c3447] text-gray-400 hover:text-white"
                            }`}
                            title={activeBuiltIn[ext.id] ? "Built-in extension active" : "Enable built-in"}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* LIST VIEW */
            <div className="space-y-2.5">
              {displayed.map((ext) => {
                const isInstalled = installedMap.has(ext.id);
                const isInstalling = installingIds.has(ext.id);
                const installedData = installedMap.get(ext.id);
                const hasThemes = installedData?.contributes?.themes && installedData.contributes.themes.length > 0;

                return (
                  <motion.div
                    key={ext.id}
                    layout
                    onClick={() => setSelectedExtension(ext)}
                    className="flex items-center justify-between gap-4 bg-[#13161f] hover:bg-[#171b26] border border-[#202534] hover:border-indigo-500/40 rounded-xl p-3.5 transition-all shadow-sm cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-[#2a3245]"
                        style={{ background: ext.iconBg || "#1a1f2c" }}
                      >
                        {typeof ext.icon === "string" && (ext.icon.startsWith("http") || ext.icon.startsWith("/")) ? (
                          <img
                            src={ext.icon}
                            alt={ext.name}
                            className="w-6 h-6 object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <span className="text-lg">{ext.icon || "⚡"}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-gray-100 hover:text-indigo-300 truncate">
                            {ext.name}
                          </h3>
                          {ext.verified && <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                          <span className="text-[10px] text-gray-400 font-mono">v{ext.version || "1.0.0"}</span>
                        </div>
                        <p className="text-xs text-gray-400 truncate max-w-xl">
                          {ext.description || "No description provided."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                      <div className="hidden sm:flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1 text-amber-400 font-medium">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          {ext.rating ? Number(ext.rating).toFixed(1) : "5.0"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="w-3.5 h-3.5" />
                          {formatDownloads(ext.downloads)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isInstalling ? (
                          <button
                            type="button"
                            disabled
                            className="py-1 px-3 rounded-lg bg-indigo-600/30 text-indigo-300 text-xs font-medium flex items-center gap-1.5"
                          >
                            <Loader2 className="w-3 h-3 animate-spin" /> Installing
                          </button>
                        ) : isInstalled ? (
                          <>
                            {hasThemes && (
                              <button
                                type="button"
                                onClick={(e) => handleApplyTheme(installedData!.contributes!.themes![0].id, e)}
                                className="py-1 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
                              >
                                Apply
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => handleUninstall(ext.id, ext.name, e)}
                              className="py-1 px-3 rounded-lg bg-[#222736] hover:bg-red-500/20 text-gray-300 hover:text-red-300 text-xs border border-[#2d3448]"
                            >
                              Uninstall
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleInstall(ext, e)}
                            className="py-1 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm"
                          >
                            Install
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#171b26] border border-[#242c3d] flex items-center justify-center text-gray-400 mb-4">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-gray-200 mb-1">No extensions found</h3>
              <p className="text-xs text-gray-400 max-w-sm">
                {isSearching
                  ? "Searching the Open VSX registry..."
                  : `No extensions matched "${query}". Try searching for another keyword or check spelling.`}
              </p>
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="mt-4 px-3 py-1.5 rounded-lg bg-[#1e2433] hover:bg-[#252d3f] text-xs font-medium text-indigo-400 border border-[#2f384d]"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}

          {/* Load More Button */}
          {visibleCount < filtered.length && (
            <div className="flex justify-center mt-8 pb-4">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 60)}
                className="px-6 py-2.5 rounded-xl bg-[#161a24] hover:bg-[#1c2230] border border-[#262e40] text-xs font-semibold text-gray-300 hover:text-white transition-all shadow-sm"
              >
                Load More Extensions ({filtered.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ─── EXTENSION DETAIL MODAL (DRAWER) ─── */}
      <AnimatePresence>
        {selectedExtension && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-2xl bg-[#11141d] border border-[#242b3b] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Close Button */}
              <button
                type="button"
                onClick={() => setSelectedExtension(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-[#1f2536] transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="p-6 border-b border-[#1e2433] bg-[#141824] flex items-start gap-4">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 border border-[#2b3347] shadow-md"
                  style={{ background: selectedExtension.iconBg || "#1e2433" }}
                >
                  {typeof selectedExtension.icon === "string" &&
                  (selectedExtension.icon.startsWith("http") || selectedExtension.icon.startsWith("/")) ? (
                    <img
                      src={selectedExtension.icon}
                      alt={selectedExtension.name}
                      className="w-10 h-10 object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="text-2xl">{selectedExtension.icon || "⚡"}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white truncate">{selectedExtension.name}</h2>
                    {selectedExtension.verified && (
                      <span title="Verified Publisher">
                        <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                    <span className="text-indigo-400 font-medium">{selectedExtension.publisher}</span>
                    <span>•</span>
                    <span className="font-mono">v{selectedExtension.version || "1.0.0"}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-amber-400 font-medium">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {selectedExtension.rating ? Number(selectedExtension.rating).toFixed(1) : "5.0"}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      {formatDownloads(selectedExtension.downloads)}
                    </span>
                  </div>

                  {/* Actions in Modal */}
                  <div className="flex items-center gap-2.5 mt-3.5">
                    {installingIds.has(selectedExtension.id) ? (
                      <button
                        type="button"
                        disabled
                        className="py-1.5 px-4 rounded-lg bg-indigo-600/30 text-indigo-300 text-xs font-semibold flex items-center gap-2 cursor-wait border border-indigo-500/30"
                      >
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Installing...
                      </button>
                    ) : installedMap.has(selectedExtension.id) ? (
                      <>
                        <span className="text-xs font-medium text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
                          <Check className="w-3.5 h-3.5" /> Installed
                        </span>
                        {installedMap.get(selectedExtension.id)?.contributes?.themes?.[0] && (
                          <button
                            type="button"
                            onClick={() =>
                              handleApplyTheme(
                                installedMap.get(selectedExtension.id)!.contributes!.themes![0].id
                              )
                            }
                            className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                          >
                            <Palette className="w-3.5 h-3.5" /> Apply Theme
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleUninstall(selectedExtension.id, selectedExtension.name)}
                          className="py-1.5 px-3 rounded-lg bg-[#1e2330] hover:bg-red-500/20 text-gray-300 hover:text-red-300 text-xs font-medium border border-[#2d3448]"
                        >
                          Uninstall
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleInstall(selectedExtension)}
                        className="py-1.5 px-4 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> Install Extension
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleCopyId(selectedExtension.id)}
                      className="py-1.5 px-2.5 rounded-lg bg-[#1a1f2c] hover:bg-[#22293b] text-gray-300 text-xs font-medium border border-[#2c354a] flex items-center gap-1.5"
                      title="Copy Extension ID"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy ID
                    </button>

                    <a
                      href={`https://open-vsx.org/extension/${selectedExtension.publisher}/${selectedExtension.name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-1.5 px-2.5 rounded-lg bg-[#1a1f2c] hover:bg-[#22293b] text-gray-300 text-xs font-medium border border-[#2c354a] flex items-center gap-1.5 ml-auto"
                    >
                      Open VSX <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Modal Navigation Tabs */}
              <div className="flex border-b border-[#1e2433] bg-[#0f121a] px-6">
                <button
                  type="button"
                  onClick={() => setModalTab("overview")}
                  className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-all ${
                    modalTab === "overview"
                      ? "border-indigo-500 text-indigo-400"
                      : "border-transparent text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab("contributions")}
                  className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-all ${
                    modalTab === "contributions"
                      ? "border-indigo-500 text-indigo-400"
                      : "border-transparent text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Contributions
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab("details")}
                  className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-all ${
                    modalTab === "details"
                      ? "border-indigo-500 text-indigo-400"
                      : "border-transparent text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Details & Metadata
                </button>
              </div>

              {/* Modal Tab Content */}
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar text-xs text-gray-300 space-y-4">
                {modalTab === "overview" && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                        Description
                      </h4>
                      <p className="text-sm text-gray-200 leading-relaxed">
                        {selectedExtension.description || "No detailed description available."}
                      </p>
                    </div>

                    <div className="bg-[#161a24] border border-[#242b3d] rounded-xl p-4">
                      <h4 className="text-xs font-semibold text-gray-200 mb-2 flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-indigo-400" /> CLI Installation Command
                      </h4>
                      <div className="flex items-center justify-between bg-[#0e1118] rounded-lg px-3 py-2 font-mono text-xs text-indigo-300 border border-[#1f2536]">
                        <span>mcode ext install {selectedExtension.id}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyId(`mcode ext install ${selectedExtension.id}`)}
                          className="text-gray-400 hover:text-white"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {modalTab === "contributions" && (
                  <div className="space-y-3">
                    {installedMap.get(selectedExtension.id)?.contributes?.themes?.length ? (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          Themes ({installedMap.get(selectedExtension.id)!.contributes!.themes!.length})
                        </h4>
                        <div className="space-y-1.5">
                          {installedMap.get(selectedExtension.id)!.contributes!.themes!.map((t) => (
                            <div
                              key={t.id}
                              className="flex items-center justify-between bg-[#161a24] p-2.5 rounded-lg border border-[#242b3d]"
                            >
                              <div className="flex items-center gap-2">
                                <Palette className="w-3.5 h-3.5 text-purple-400" />
                                <span className="font-medium text-gray-200">{t.label}</span>
                                <span className="text-[10px] text-gray-400 font-mono">({t.uiTheme})</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleApplyTheme(t.id)}
                                className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium"
                              >
                                Apply Theme
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {installedMap.get(selectedExtension.id)?.contributes?.snippets?.length ? (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          Snippets
                        </h4>
                        <div className="space-y-1.5">
                          {installedMap.get(selectedExtension.id)!.contributes!.snippets!.map((s) => (
                            <div
                              key={s.language}
                              className="bg-[#161a24] p-2.5 rounded-lg border border-[#242b3d] flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <FileCode className="w-3.5 h-3.5 text-yellow-400" />
                                <span className="font-medium text-gray-200">{s.language}</span>
                              </div>
                              <span className="text-[11px] bg-[#1e2433] px-2 py-0.5 rounded text-gray-400 font-mono">
                                {s.snippets.length} snippets
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {!installedMap.has(selectedExtension.id) && (
                      <div className="p-8 text-center text-gray-400 bg-[#141824] rounded-xl border border-[#202738]">
                        <Info className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
                        <p className="text-xs">
                          Install this extension to inspect and activate its themes, snippets, and tools.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {modalTab === "details" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#161a24] p-3 rounded-lg border border-[#242b3d]">
                        <div className="text-[10px] text-gray-400 uppercase font-semibold">Extension ID</div>
                        <div className="font-mono text-gray-200 mt-1 truncate">{selectedExtension.id}</div>
                      </div>
                      <div className="bg-[#161a24] p-3 rounded-lg border border-[#242b3d]">
                        <div className="text-[10px] text-gray-400 uppercase font-semibold">Publisher</div>
                        <div className="text-gray-200 mt-1 truncate">{selectedExtension.publisher}</div>
                      </div>
                      <div className="bg-[#161a24] p-3 rounded-lg border border-[#242b3d]">
                        <div className="text-[10px] text-gray-400 uppercase font-semibold">Version</div>
                        <div className="font-mono text-gray-200 mt-1">{selectedExtension.version || "1.0.0"}</div>
                      </div>
                      <div className="bg-[#161a24] p-3 rounded-lg border border-[#242b3d]">
                        <div className="text-[10px] text-gray-400 uppercase font-semibold">Category</div>
                        <div className="text-gray-200 mt-1">{selectedExtension.category || "General"}</div>
                      </div>
                    </div>

                    <div className="bg-[#161a24] p-3 rounded-lg border border-[#242b3d]">
                      <div className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Direct Download Link</div>
                      <div className="font-mono text-[11px] text-indigo-400 truncate">
                        {selectedExtension.downloadUrl ||
                          `https://open-vsx.org/api/${selectedExtension.publisher}/${selectedExtension.name}/${selectedExtension.version}/file.vsix`}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function parseDownloads(value: any): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const str = String(value);
  const num = parseFloat(str);
  if (str.includes("M")) return num * 1_000_000;
  if (str.includes("K")) return num * 1_000;
  return isNaN(num) ? 0 : num;
}

function formatDownloads(val: any): string {
  if (!val) return "1K+";
  const num = typeof val === "number" ? val : parseDownloads(val);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${Math.round(num / 1_000)}K`;
  return String(num);
}
