"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Layers,
  RotateCw,
  Plus,
  Play,
  Square,
  Trash2,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  ExternalLink,
  BookOpen,
  Star,
  Film,
  Sparkles,
  HelpCircle,
  HardDrive,
  Network,
  Disc,
  Link as LinkIcon,
} from "lucide-react";
import { useIDEStore } from "../../store/ideStore";
import { toast } from "sonner";

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: "running" | "stopped" | "paused";
  ports: string[];
}

export interface DockerImage {
  id: string;
  repository: string;
  tag: string;
  size: string;
}

const DEFAULT_CONTAINERS: DockerContainer[] = [
  {
    id: "c18f92a",
    name: "antigravity-dev-env",
    image: "node:20-alpine",
    status: "running",
    ports: ["3000:3000", "3100:3100"],
  },
  {
    id: "d9203bc",
    name: "redis-cache",
    image: "redis:7-alpine",
    status: "stopped",
    ports: ["6379:6379"],
  },
];

const DEFAULT_IMAGES: DockerImage[] = [
  { id: "img-node20", repository: "node", tag: "20-alpine", size: "174.2MB" },
  { id: "img-redis7", repository: "redis", tag: "7-alpine", size: "32.4MB" },
  { id: "img-python3", repository: "python", tag: "3.11-slim", size: "152.0MB" },
];

export function ContainersPanel() {
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [images, setImages] = useState<DockerImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [daemonActive, setDaemonActive] = useState(false);

  // Sections collapse states
  const [sections, setSections] = useState({
    containers: true,
    images: true,
    registries: true,
    networks: false,
    volumes: false,
    contexts: false,
    help: true,
  });

  const fetchDockerState = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, iRes] = await Promise.all([
        fetch("/api/docker/containers"),
        fetch("/api/docker/images"),
      ]);
      const cData = await cRes.json();
      const iData = await iRes.json();

      if (cData.available && cData.containers && cData.containers.length > 0) {
        setContainers(cData.containers);
        setDaemonActive(true);
      } else {
        setContainers(DEFAULT_CONTAINERS);
      }

      if (iData.available && iData.images && iData.images.length > 0) {
        setImages(iData.images);
      } else {
        setImages(DEFAULT_IMAGES);
      }
    } catch {
      setContainers(DEFAULT_CONTAINERS);
      setImages(DEFAULT_IMAGES);
      setDaemonActive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDockerState();
  }, [fetchDockerState]);

  const toggleSection = (key: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleStartContainer = (id: string, name: string) => {
    setContainers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "running" } : c))
    );
    toast.success(`Started container: ${name}`);
  };

  const handleStopContainer = (id: string, name: string) => {
    setContainers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "stopped" } : c))
    );
    toast.info(`Stopped container: ${name}`);
  };

  const handleRemoveContainer = (id: string, name: string) => {
    setContainers((prev) => prev.filter((c) => c.id !== id));
    toast.info(`Removed container: ${name}`);
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] text-white/80 select-none text-xs min-w-[240px] overflow-hidden">
      {/* Top Header matching screenshot */}
      <div className="p-2.5 border-b border-white/5 flex items-center justify-between gap-2 bg-[#181818]/90 flex-shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          <Box className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <span className="font-semibold uppercase tracking-wider text-white/60 text-[11px] truncate">
            CONTAINERS
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={fetchDockerState}
            disabled={loading}
            className={`p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition ${
              loading ? "animate-spin text-blue-400" : ""
            }`}
            title="Refresh Docker Daemon"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Accordion Sub-sections */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col">
        {/* 1. CONTAINERS */}
        <div className="border-b border-white/5">
          <div
            onClick={() => toggleSection("containers")}
            className="flex items-center justify-between px-3 py-1.5 hover:bg-white/5 cursor-pointer text-[11px] font-bold text-white/60 tracking-wider"
          >
            <div className="flex items-center gap-1.5 truncate">
              {sections.containers ? (
                <ChevronDown className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
              )}
              <span>Containers</span>
            </div>
            {containers.length > 0 && (
              <span className="text-[10px] text-white/30 px-1.5 py-0.2 rounded bg-white/5">
                {containers.length}
              </span>
            )}
          </div>

          {sections.containers && (
            <div className="py-1 bg-black/20 flex flex-col gap-0.5">
              {containers.length === 0 ? (
                <p className="px-6 py-2 text-white/40 text-[11px] italic">Nothing to show.</p>
              ) : (
                containers.map((c) => (
                  <div
                    key={c.id}
                    className="group flex items-center justify-between px-3 py-1 hover:bg-white/5 mx-1 rounded transition"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          c.status === "running"
                            ? "bg-[#4caf50] shadow-[0_0_6px_rgba(76,175,80,0.8)]"
                            : "bg-[#8a8a8a]"
                        }`}
                      />
                      <div className="flex items-baseline gap-1.5 truncate">
                        <span className="text-white/80 group-hover:text-white font-mono text-[11px] truncate">
                          {c.name}
                        </span>
                        <span className="text-white/30 text-[10px] truncate">{c.image}</span>
                      </div>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition">
                      {c.status === "running" ? (
                        <button
                          type="button"
                          onClick={() => handleStopContainer(c.id, c.name)}
                          className="p-1 rounded text-white/40 hover:text-red-400 hover:bg-white/10"
                          title="Stop"
                        >
                          <Square className="w-3 h-3 fill-current" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartContainer(c.id, c.name)}
                          className="p-1 rounded text-white/40 hover:text-emerald-400 hover:bg-white/10"
                          title="Start"
                        >
                          <Play className="w-3 h-3 fill-current" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveContainer(c.id, c.name)}
                        className="p-1 rounded text-white/40 hover:text-red-400 hover:bg-white/10"
                        title="Remove"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 2. IMAGES */}
        <div className="border-b border-white/5">
          <div
            onClick={() => toggleSection("images")}
            className="flex items-center justify-between px-3 py-1.5 hover:bg-white/5 cursor-pointer text-[11px] font-bold text-white/60 tracking-wider"
          >
            <div className="flex items-center gap-1.5 truncate">
              {sections.images ? (
                <ChevronDown className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
              )}
              <span>Images</span>
            </div>
            {images.length > 0 && (
              <span className="text-[10px] text-white/30 px-1.5 py-0.2 rounded bg-white/5">
                {images.length}
              </span>
            )}
          </div>

          {sections.images && (
            <div className="py-1 bg-black/20 flex flex-col gap-0.5">
              {images.length === 0 ? (
                <p className="px-6 py-2 text-white/40 text-[11px] italic">Nothing to show.</p>
              ) : (
                images.map((img) => (
                  <div
                    key={img.id}
                    className="flex items-center justify-between px-3 py-1 hover:bg-white/5 mx-1 rounded text-[11px]"
                  >
                    <div className="flex items-baseline gap-1.5 truncate">
                      <span className="text-base">🖼</span>
                      <span className="text-white/80 font-mono">
                        {img.repository}:{img.tag}
                      </span>
                    </div>
                    <span className="text-white/30 text-[10px] font-mono">{img.size}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 3. REGISTRIES */}
        <div className="border-b border-white/5">
          <div
            onClick={() => toggleSection("registries")}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/5 cursor-pointer text-[11px] font-bold text-white/60 tracking-wider"
          >
            {sections.registries ? (
              <ChevronDown className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
            )}
            <span>Registries</span>
          </div>

          {sections.registries && (
            <div className="px-4 py-1.5 bg-black/20 text-[11px]">
              <button
                type="button"
                onClick={() => toast.info("Connect Registry modal opened")}
                className="flex items-center gap-1.5 text-[#3794ff] hover:underline cursor-pointer bg-transparent border-none p-0"
              >
                <span>🔌</span> Connect Registry...
              </button>
            </div>
          )}
        </div>

        {/* 4. NETWORKS */}
        <div className="border-b border-white/5">
          <div
            onClick={() => toggleSection("networks")}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/5 cursor-pointer text-[11px] font-bold text-white/60 tracking-wider"
          >
            {sections.networks ? (
              <ChevronDown className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
            )}
            <span>Networks</span>
          </div>
          {sections.networks && (
            <div className="px-6 py-2 text-white/40 text-[11px] italic bg-black/20">
              bridge, host, none (default)
            </div>
          )}
        </div>

        {/* 5. VOLUMES */}
        <div className="border-b border-white/5">
          <div
            onClick={() => toggleSection("volumes")}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/5 cursor-pointer text-[11px] font-bold text-white/60 tracking-wider"
          >
            {sections.volumes ? (
              <ChevronDown className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
            )}
            <span>Volumes</span>
          </div>
          {sections.volumes && (
            <div className="px-6 py-2 text-white/40 text-[11px] italic bg-black/20">
              No local volumes mounted.
            </div>
          )}
        </div>

        {/* 6. DOCKER CONTEXTS */}
        <div className="border-b border-white/5">
          <div
            onClick={() => toggleSection("contexts")}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/5 cursor-pointer text-[11px] font-bold text-white/60 tracking-wider"
          >
            {sections.contexts ? (
              <ChevronDown className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
            )}
            <span>Docker Contexts</span>
          </div>
          {sections.contexts && (
            <div className="px-6 py-2 text-white/40 text-[11px] bg-black/20">
              ● default (unix:///var/run/docker.sock)
            </div>
          )}
        </div>

        {/* 7. HELP AND FEEDBACK (matching screenshot exact rows) */}
        <div className="border-b border-white/5">
          <div
            onClick={() => toggleSection("help")}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/5 cursor-pointer text-[11px] font-bold text-white/60 tracking-wider"
          >
            {sections.help ? (
              <ChevronDown className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
            )}
            <span>Help and Feedback</span>
          </div>

          {sections.help && (
            <div className="py-1 px-4 bg-black/20 text-[11px] flex flex-col gap-1.5 text-white/70">
              <a
                href="https://code.visualstudio.com/docs/containers/overview"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white hover:underline flex items-center gap-1.5"
              >
                <span>📖</span> Read Extension Documentation
              </a>
              <a
                href="https://docs.docker.com/get-started/"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white hover:underline flex items-center gap-1.5"
              >
                <span>⭐</span> Get Started with Docker Tutorial
              </a>
              <div className="hover:text-white cursor-pointer flex items-center gap-1.5">
                <span>🎬</span> Open Container Tools Extension Walkthrough
              </div>
              <div className="hover:text-white cursor-pointer flex items-center gap-1.5">
                <span>🐳</span> Install Docker DX for Improved Editing
              </div>
              <a
                href="https://github.com/microsoft/vscode-docker/issues"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white hover:underline flex items-center gap-1.5"
              >
                <span>⊙</span> Review Issues
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-2 border-t border-white/5 bg-white/[0.01] text-[10px] text-white/30 flex items-center justify-between flex-shrink-0">
        <span>Docker Engine: {daemonActive ? "Connected" : "Simulated"}</span>
        <span className="text-white/20 font-mono">v26.1</span>
      </div>
    </div>
  );
}

export default ContainersPanel;
