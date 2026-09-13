"use client";

import React, { useEffect, useMemo, useState } from "react";
import { catalog as staticCatalog, categories } from "@/lib/extensions/catalog";
import { runtime } from "@/lib/extensions/runtime";
import extensionInstaller, { InstalledExtension } from "@/lib/extensions/installer";
import api from "@/lib/axios";

const STORAGE_KEY = "activeExtensions";

export interface ExtensionsMarketplaceProps {
  editorApi?: any; // pass your Monaco/CodeMirror wrapper here
}

export default function ExtensionsMarketplace({ editorApi = {} }: ExtensionsMarketplaceProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All categories");
  const [sortBy, setSortBy] = useState<"Relevance" | "Downloads" | "Rating" | "Name">("Relevance");
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [catalog, setCatalog] = useState<any[]>(staticCatalog);
  const [installedList, setInstalledList] = useState<InstalledExtension[]>([]);
  const [installingIds, setInstallingIds] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Subscribe to installed extensions & installing state
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

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { "All categories": catalog.length };
    catalog.forEach((ext) => {
      if (ext.category) {
        counts[ext.category] = (counts[ext.category] || 0) + 1;
      }
    });
    return counts;
  }, [catalog]);

  // Live search from Open VSX backend proxy
  useEffect(() => {
    if (!debouncedQuery && activeCategory === "All categories") {
      setCatalog(staticCatalog);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const catQuery = activeCategory !== "All categories" ? `&category=${encodeURIComponent(activeCategory)}` : "";
    api.get(`/api/v1/extensions/search?q=${encodeURIComponent(debouncedQuery)}${catQuery}`)
      .then((res) => {
        if (res.data?.extensions && res.data.extensions.length > 0) {
          const map = new Map<string, any>();
          staticCatalog.forEach((e) => map.set(e.id, e));
          res.data.extensions.forEach((e: any) => {
            map.set(e.id, {
              ...e,
              category: activeCategory !== "All categories" ? activeCategory : (e.category || "Tools"),
              iconBg: "#2d2d30",
            });
          });
          setCatalog(Array.from(map.values()));
        }
      })
      .catch((err) => {
        console.warn("[marketplace] Search fallback:", err);
      })
      .finally(() => {
        setIsSearching(false);
      });
  }, [debouncedQuery, activeCategory]);

  // restore previously activated extensions on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      setActive(saved);
      Object.entries(saved).forEach(([id, isOn]) => {
        if (isOn) runtime[id]?.activate(editorApi);
      });
    } catch (e) {
      console.error("Failed to restore extensions:", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleBuiltIn(id: string) {
    const turningOn = !active[id];
    if (turningOn) runtime[id]?.activate(editorApi);
    else runtime[id]?.deactivate(editorApi);

    const next = { ...active, [id]: turningOn };
    setActive(next);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error("Failed to save extensions state:", e);
      }
    }
  }

  async function handleInstall(ext: any) {
    await extensionInstaller.install({
      id: ext.id,
      name: ext.name,
      version: ext.version,
      downloadUrl: ext.downloadUrl,
    });
  }

  async function handleUninstall(id: string) {
    await extensionInstaller.uninstall(id);
  }

  function handleApplyTheme(themeId: string) {
    extensionInstaller.applyTheme(themeId);
  }

  const [visibleCount, setVisibleCount] = useState(60);

  const filtered = useMemo(() => {
    let list = catalog;

    if (activeCategory && activeCategory !== "All categories") {
      list = list.filter((ext) => ext.category === activeCategory);
    }

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
  }, [catalog, debouncedQuery, activeCategory, sortBy]);

  const displayed = useMemo(() => {
    return filtered.slice(0, visibleCount);
  }, [filtered, visibleCount]);

  return (
    <div style={styles.page}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarLabel}>CATEGORIES</div>
        {categories.map((cat) => {
          const count = categoryCounts[cat] || 0;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setActiveCategory(cat);
                setVisibleCount(60);
              }}
              style={{
                ...styles.sidebarItem,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                ...(activeCategory === cat ? styles.sidebarItemActive : {}),
              }}
            >
              <span>{cat}</span>
              <span style={styles.categoryBadge}>{count}</span>
            </button>
          );
        })}

        {installedList.length > 0 && (
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #2d2d2d" }}>
            <div style={styles.sidebarLabel}>INSTALLED EXTENSIONS ({installedList.length})</div>
            {installedList.slice(0, 8).map((inst) => (
              <div key={inst.id} style={{ fontSize: 12, color: "#9ca3af", padding: "4px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>
                  {inst.name}
                </span>
                <span style={{ color: "#10b981", fontSize: 10 }}>✓</span>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main style={styles.main}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>Extensions Marketplace</h1>
            <p style={styles.subtitle}>
              Browse, search, and install extensions directly from Open VSX
              {isSearching && <span style={{ marginLeft: 8, color: "#818cf8" }}>Searching...</span>}
            </p>
          </div>
          <div style={styles.sortRow}>
            <span style={{ fontSize: 13, color: "#8a8a8a" }}>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={styles.sortSelect}
            >
              <option value="Relevance">Relevance</option>
              <option value="Downloads">Downloads</option>
              <option value="Rating">Rating</option>
              <option value="Name">Name</option>
            </select>
          </div>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search extensions from Open VSX (e.g. eslint, python, dracula, prettier)..."
          style={styles.search}
        />

        <div style={styles.grid}>
          {displayed.map((ext) => {
            const isInstalled = installedMap.has(ext.id);
            const isInstalling = installingIds.has(ext.id);
            const installedData = installedMap.get(ext.id);
            const hasThemes = (installedData?.contributes?.themes && installedData.contributes.themes.length > 0);
            const isBuiltIn = Boolean(runtime[ext.id]);

            return (
              <div key={ext.id} style={styles.card}>
                <div style={{ ...styles.icon, background: ext.iconBg || "#2d2d30" }}>
                  {typeof ext.icon === "string" && (ext.icon.startsWith("http") || ext.icon.startsWith("/")) ? (
                    <img
                      src={ext.icon}
                      alt={ext.name}
                      style={{ width: 28, height: 28, objectFit: "contain", borderRadius: 4 }}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span>{ext.icon || "⚡"}</span>
                  )}
                </div>
                <div style={styles.cardName}>{ext.name}</div>
                <div style={styles.cardDesc}>{ext.description || "No description provided."}</div>
                <div style={styles.publisherRow}>
                  <span>{ext.publisher}</span>
                  {ext.verified && <span style={styles.verifiedBadge}>✓</span>}
                  <span style={styles.version}>{ext.version || "1.0.0"}</span>
                </div>
                <div style={styles.statsRow}>
                  <span>★ {ext.rating || "5.0"} {ext.reviewCount ? `(${ext.reviewCount})` : ""}</span>
                  <span>⬇ {ext.downloads ? String(ext.downloads) : "1k+"}</span>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                  {/* Real-time Open VSX Install / Uninstall */}
                  {isInstalling ? (
                    <button
                      type="button"
                      disabled
                      style={{ ...styles.installButton, opacity: 0.7, cursor: "wait" }}
                    >
                      ⏳ Installing...
                    </button>
                  ) : isInstalled ? (
                    <div style={{ display: "flex", width: "100%", gap: 6 }}>
                      {hasThemes && (
                        <button
                          type="button"
                          onClick={() => handleApplyTheme(installedData!.contributes!.themes![0].id)}
                          style={{
                            flex: 1,
                            padding: "8px 0",
                            borderRadius: 6,
                            border: "none",
                            cursor: "pointer",
                            background: "#2563eb",
                            color: "#fff",
                            fontWeight: 600,
                            fontSize: 12,
                          }}
                        >
                          🎨 Apply Theme
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleUninstall(ext.id)}
                        style={{
                          flex: 1,
                          padding: "8px 0",
                          borderRadius: 6,
                          border: "1px solid #4b5563",
                          cursor: "pointer",
                          background: "#374151",
                          color: "#f87171",
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      >
                        Uninstall
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleInstall(ext)}
                      style={styles.installButton}
                    >
                      Install
                    </button>
                  )}

                  {/* Built-in runtime toggle if applicable */}
                  {isBuiltIn && !isInstalled && (
                    <button
                      type="button"
                      onClick={() => toggleBuiltIn(ext.id)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: "1px solid #3c3c3c",
                        cursor: "pointer",
                        background: active[ext.id] ? "#15803d" : "#262626",
                        color: "#fff",
                        fontSize: 12,
                      }}
                      title="Quick Enable/Disable built-in runtime"
                    >
                      {active[ext.id] ? "Active" : "Enable"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ color: "#8a8a8a", padding: 24, gridColumn: "1 / -1", textAlign: "center" }}>
              {isSearching ? "Searching Open VSX registry..." : "No extensions match your search."}
            </div>
          )}
        </div>

        {visibleCount < filtered.length && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 60)}
              style={{
                padding: "10px 24px",
                borderRadius: 8,
                background: "#252526",
                border: "1px solid #3c3c3c",
                color: "#cccccc",
                fontSize: 13,
                cursor: "pointer",
                fontWeight: 500,
                transition: "all 0.15s ease",
              }}
            >
              Load More Extensions ({filtered.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </main>
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

const styles: Record<string, React.CSSProperties> = {
  page: { display: "flex", minHeight: "100%", width: "100%", background: "#1e1e1e", color: "#e8e8e8", fontFamily: "system-ui, sans-serif" },
  sidebar: { width: 240, padding: "24px 16px", borderRight: "1px solid #2d2d2d", flexShrink: 0 },
  sidebarLabel: { fontSize: 11, letterSpacing: 1, color: "#8a8a8a", marginBottom: 12, fontWeight: 600 },
  sidebarItem: {
    display: "block", width: "100%", textAlign: "left", background: "none", border: "none",
    color: "#c8c8c8", padding: "8px 10px", borderRadius: 6, cursor: "pointer", fontSize: 14, marginBottom: 2,
  },
  sidebarItemActive: { background: "#3a2f4d", color: "#c9a4ff" },
  categoryBadge: { fontSize: 11, background: "#2a2a2a", padding: "2px 6px", borderRadius: 10, color: "#8a8a8a" },
  main: { flex: 1, padding: "32px 40px", overflowY: "auto" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 },
  title: { fontSize: 28, margin: 0, fontWeight: 700 },
  subtitle: { color: "#8a8a8a", fontSize: 14, marginTop: 4 },
  sortRow: { display: "flex", alignItems: "center", gap: 8 },
  sortSelect: { background: "#2a2a2a", color: "#e8e8e8", border: "1px solid #3a3a3a", borderRadius: 6, padding: "6px 10px" },
  search: {
    width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #3a3a3a",
    background: "#2a2a2a", color: "#e8e8e8", marginBottom: 24, fontSize: 14,
  },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 },
  card: { background: "#252525", border: "1px solid #333", borderRadius: 10, padding: 16, display: "flex", flexDirection: "column" },
  icon: { width: 44, height: 44, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 10 },
  cardName: { fontWeight: 600, fontSize: 15, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: "#a8a8a8", marginBottom: 10, lineHeight: 1.4, minHeight: 36 },
  publisherRow: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#8a8a8a", marginBottom: 6 },
  verifiedBadge: { color: "#7c9eff" },
  version: { marginLeft: "auto" },
  statsRow: { display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8a8a8a", marginBottom: 12 },
  installButton: {
    width: "100%", padding: "8px 0", borderRadius: 6, border: "none", cursor: "pointer",
    background: "#4f46e5", color: "#fff", fontWeight: 600, fontSize: 13,
  },
};
