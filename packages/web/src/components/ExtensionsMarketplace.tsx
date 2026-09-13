"use client";

import React, { useEffect, useMemo, useState } from "react";
import { catalog as staticCatalog, categories } from "@/lib/extensions/catalog";
import { runtime } from "@/lib/extensions/runtime";
import api from "@/lib/axios";

const STORAGE_KEY = "activeExtensions";

export interface ExtensionsMarketplaceProps {
  editorApi?: any; // pass your Monaco/CodeMirror wrapper here
}

export default function ExtensionsMarketplace({ editorApi = {} }: ExtensionsMarketplaceProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All categories");
  const [sortBy, setSortBy] = useState<"Relevance" | "Downloads" | "Rating" | "Name">("Relevance");
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [catalog, setCatalog] = useState<any[]>(staticCatalog);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { "All categories": catalog.length };
    catalog.forEach((ext) => {
      if (ext.category) {
        counts[ext.category] = (counts[ext.category] || 0) + 1;
      }
    });
    return counts;
  }, [catalog]);

  // Live search from Open VSX
  useEffect(() => {
    if (!query && activeCategory === "All categories") {
      setCatalog(staticCatalog);
      return;
    }
    const catQuery = activeCategory !== "All categories" ? `&category=${encodeURIComponent(activeCategory)}` : "";
    api.get(`/api/v1/extensions/search?q=${encodeURIComponent(query)}${catQuery}`)
      .then((res) => {
        if (res.data?.extensions && res.data.extensions.length > 0) {
          const map = new Map<string, any>();
          staticCatalog.forEach((e) => map.set(e.id, e));
          res.data.extensions.forEach((e: any) => map.set(e.id, e));
          setCatalog(Array.from(map.values()));
        }
      })
      .catch(() => {
        // Fall back to static catalog
      });
  }, [query, activeCategory]);

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

  function toggle(id: string) {
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

  const [visibleCount, setVisibleCount] = useState(60);

  const filtered = useMemo(() => {
    let list = catalog;

    if (activeCategory && activeCategory !== "All categories") {
      list = list.filter((ext) => ext.category === activeCategory);
    }

    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
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
        list = [...list].sort((a, b) => b.rating - a.rating);
        break;
      case "Name":
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return list;
  }, [catalog, query, activeCategory, sortBy]);

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
              onClick={() => setActiveCategory(cat)}
              style={{
                ...styles.sidebarItem,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                ...(activeCategory === cat ? styles.sidebarItemActive : {}),
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat}</span>
              <span style={{ fontSize: 11, opacity: 0.5, marginLeft: 8 }}>{count}</span>
            </button>
          );
        })}
      </aside>

      {/* Main content */}
      <main style={styles.main}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>All extensions</h1>
            <div style={styles.subtitle}>{filtered.length} extensions found</div>
          </div>
          <div style={styles.sortRow}>
            <span style={{ color: "#8a8a8a", fontSize: 13 }}>Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={styles.sortSelect}
            >
              <option>Relevance</option>
              <option>Downloads</option>
              <option>Rating</option>
              <option>Name</option>
            </select>
          </div>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search extensions..."
          style={styles.search}
        />

        <div style={styles.grid}>
          {displayed.map((ext) => (
            <div key={ext.id} style={styles.card}>
              <div style={{ ...styles.icon, background: ext.iconBg }}>{ext.icon}</div>
              <div style={styles.cardName}>{ext.name}</div>
              <div style={styles.cardDesc}>{ext.description}</div>
              <div style={styles.publisherRow}>
                <span>{ext.publisher}</span>
                {ext.verified && <span style={styles.verifiedBadge}>✓</span>}
                <span style={styles.version}>{ext.version}</span>
              </div>
              <div style={styles.statsRow}>
                <span>★ {ext.rating} ({ext.reviewCount})</span>
                <span>⬇ {ext.downloads}</span>
              </div>
              <button
                type="button"
                onClick={() => toggle(ext.id)}
                style={{
                  ...styles.installButton,
                  ...(active[ext.id] ? styles.disableButton : {}),
                }}
              >
                {active[ext.id] ? "Disable" : "Enable"}
              </button>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ color: "#8a8a8a", padding: 24 }}>No extensions match your search.</div>
          )}
        </div>

        {visibleCount < filtered.length && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 60)}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                background: '#252526',
                border: '1px solid #3c3c3c',
                color: '#cccccc',
                fontSize: 13,
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all 0.15s ease',
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

function parseDownloads(value: string): number {
  const num = parseFloat(value);
  if (value.includes("M")) return num * 1_000_000;
  if (value.includes("K")) return num * 1_000;
  return num;
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: "flex", minHeight: "100%", width: "100%", background: "#1e1e1e", color: "#e8e8e8", fontFamily: "system-ui, sans-serif" },
  sidebar: { width: 220, padding: "24px 16px", borderRight: "1px solid #2d2d2d", flexShrink: 0 },
  sidebarLabel: { fontSize: 11, letterSpacing: 1, color: "#8a8a8a", marginBottom: 12 },
  sidebarItem: {
    display: "block", width: "100%", textAlign: "left", background: "none", border: "none",
    color: "#c8c8c8", padding: "8px 10px", borderRadius: 6, cursor: "pointer", fontSize: 14, marginBottom: 2,
  },
  sidebarItemActive: { background: "#3a2f4d", color: "#c9a4ff" },
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
  card: { background: "#252525", border: "1px solid #333", borderRadius: 10, padding: 16 },
  icon: { width: 44, height: 44, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 10 },
  cardName: { fontWeight: 600, fontSize: 15, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: "#a8a8a8", marginBottom: 10, lineHeight: 1.4, minHeight: 36 },
  publisherRow: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#8a8a8a", marginBottom: 6 },
  verifiedBadge: { color: "#7c9eff" },
  version: { marginLeft: "auto" },
  statsRow: { display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8a8a8a", marginBottom: 12 },
  installButton: {
    width: "100%", padding: "8px 0", borderRadius: 6, border: "none", cursor: "pointer",
    background: "#5a3fd6", color: "#fff", fontWeight: 600, fontSize: 13,
  },
  disableButton: { background: "#3a3a3a", color: "#e8e8e8" },
};
