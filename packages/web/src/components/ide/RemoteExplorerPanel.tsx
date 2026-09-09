"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Monitor,
  Server,
  Box,
  Plus,
  RotateCw,
  Terminal,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Circle,
  HelpCircle,
  Settings,
} from "lucide-react";
import { useIDEStore } from "../../store/ideStore";
import { toast } from "sonner";

export interface RemoteTarget {
  id: string;
  category: "devcontainer" | "ssh" | "wsl";
  name: string;
  status: "connected" | "available" | "unavailable";
  details?: string;
}

const DEFAULT_TARGETS: RemoteTarget[] = [
  {
    id: "wsl-docker-desktop",
    category: "wsl",
    name: "docker-desktop",
    status: "available",
    details: "default distro",
  },
];

const STORAGE_KEY_SSH = "antigravity_remote_ssh_hosts";
const STORAGE_KEY_CONTAINERS = "antigravity_remote_containers";

export interface RemoteExplorerPanelProps {
  targets?: RemoteTarget[];
  workspaceId?: string | null;
  activeBranch?: string;
}

export function RemoteExplorerPanel({
  targets: propTargets,
  workspaceId,
  activeBranch,
}: RemoteExplorerPanelProps = {}) {
  const [selectedProvider, setSelectedProvider] = useState<string>("Dev Containers (Antigravity)");
  const [customSshHosts, setCustomSshHosts] = useState<RemoteTarget[]>([]);
  const [customContainers, setCustomContainers] = useState<RemoteTarget[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Collapsible section states
  const [openSections, setOpenSections] = useState({
    devcontainer: true,
    ssh: true,
    wsl: true,
  });

  // Modal / Inline input state for adding SSH Host
  const [isAddingSsh, setIsAddingSsh] = useState(false);
  const [sshHostInput, setSshHostInput] = useState("");
  const [sshUserInput, setSshUserInput] = useState("");
  const [sshPortInput, setSshPortInput] = useState("22");

  // Load persisted custom SSH hosts & containers from localStorage
  useEffect(() => {
    try {
      const savedSsh = localStorage.getItem(STORAGE_KEY_SSH);
      if (savedSsh) setCustomSshHosts(JSON.parse(savedSsh));
      const savedContainers = localStorage.getItem(STORAGE_KEY_CONTAINERS);
      if (savedContainers) setCustomContainers(JSON.parse(savedContainers));
    } catch {
      // ignore parse errors
    }
  }, []);

  const saveSshHosts = (hosts: RemoteTarget[]) => {
    setCustomSshHosts(hosts);
    try {
      localStorage.setItem(STORAGE_KEY_SSH, JSON.stringify(hosts));
    } catch {}
  };

  // Compile all targets
  const allTargets = useMemo<RemoteTarget[]>(() => {
    if (propTargets) return propTargets;

    const list: RemoteTarget[] = [...DEFAULT_TARGETS, ...customContainers, ...customSshHosts];

    // If active workspace is mounted, add it as connected Dev Container
    if (workspaceId) {
      const wsIdShort = workspaceId.slice(0, 8);
      const wsContainer: RemoteTarget = {
        id: `ws-${workspaceId}`,
        category: "devcontainer",
        name: `workspace-${wsIdShort}`,
        status: "connected",
        details: activeBranch ? `branch: ${activeBranch}` : "active session",
      };
      // Avoid duplicate
      if (!list.some((t) => t.id === wsContainer.id)) {
        list.unshift(wsContainer);
      }
    }

    return list;
  }, [propTargets, customContainers, customSshHosts, workspaceId, activeBranch]);

  const devContainers = useMemo(
    () => allTargets.filter((t) => t.category === "devcontainer"),
    [allTargets]
  );
  const sshHosts = useMemo(
    () => allTargets.filter((t) => t.category === "ssh"),
    [allTargets]
  );
  const wslTargets = useMemo(
    () => allTargets.filter((t) => t.category === "wsl"),
    [allTargets]
  );

  const toggleSection = (cat: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Remote targets refreshed");
    }, 400);
  };

  const handleAddSshHost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sshHostInput.trim()) return;

    const hostname = sshHostInput.trim();
    const user = sshUserInput.trim() || "root";
    const port = sshPortInput.trim() || "22";

    const newTarget: RemoteTarget = {
      id: `ssh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      category: "ssh",
      name: `${user}@${hostname}`,
      status: "available",
      details: `port ${port}`,
    };

    saveSshHosts([...customSshHosts, newTarget]);
    setSshHostInput("");
    setSshUserInput("");
    setSshPortInput("22");
    setIsAddingSsh(false);
    toast.success(`Configured SSH host: ${newTarget.name}`);
  };

  const handleRemoveSshHost = (id: string, name: string) => {
    const updated = customSshHosts.filter((h) => h.id !== id);
    saveSshHosts(updated);
    toast.info(`Removed SSH host: ${name}`);
  };

  const handleConnect = (target: RemoteTarget) => {
    toast.info(`Connecting to ${target.name} (${target.category.toUpperCase()})...`);
    // If terminal runner is bound, announce connection
    const runCmd = useIDEStore.getState().runTerminalCommandFn;
    if (runCmd) {
      if (target.category === "ssh") {
        runCmd(`ssh ${target.name}`);
      } else if (target.category === "wsl") {
        runCmd(`wsl -d ${target.name}`);
      } else {
        runCmd(`docker exec -it ${target.name} /bin/bash`);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] text-white/80 select-none text-xs min-w-[240px] overflow-hidden">
      {/* Top Header Row matching screenshot */}
      <div className="p-2.5 border-b border-white/5 flex items-center justify-between gap-2 bg-[#181818]/90">
        <span className="font-semibold uppercase tracking-wider text-white/60 text-[11px] truncate flex-shrink-0">
          REMOTE EXPLORER
        </span>

        <div className="flex items-center gap-1.5 min-w-0">
          <select
            value={selectedProvider}
            onChange={(e) => {
              setSelectedProvider(e.target.value);
              // Auto-expand selected section
              if (e.target.value.startsWith("Dev Containers")) {
                setOpenSections((prev) => ({ ...prev, devcontainer: true }));
              } else if (e.target.value.startsWith("SSH")) {
                setOpenSections((prev) => ({ ...prev, ssh: true }));
              } else if (e.target.value.startsWith("WSL")) {
                setOpenSections((prev) => ({ ...prev, wsl: true }));
              }
            }}
            className="bg-[#252526] text-white/90 text-[11px] px-2 py-1 rounded border border-white/10 outline-none max-w-[170px] truncate hover:border-white/20 transition cursor-pointer"
          >
            <option value="Dev Containers (Antigravity)">Dev Containers (Antigravity)</option>
            <option value="SSH (Antigravity)">SSH (Antigravity)</option>
            <option value="WSL Targets (Antigravity)">WSL Targets (Antigravity)</option>
          </select>

          <button
            type="button"
            onClick={handleRefresh}
            className={`p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition ${
              isRefreshing ? "animate-spin text-blue-400" : ""
            }`}
            title="Refresh Remote Targets"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Accordion Sub-sections */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col">
        {/* Section 1: Dev Containers (Antigravity) */}
        <div className="border-b border-white/5">
          <div
            onClick={() => toggleSection("devcontainer")}
            className={`flex items-center justify-between px-3 py-1.5 hover:bg-white/5 cursor-pointer text-[11px] font-bold tracking-wider transition ${
              selectedProvider.startsWith("Dev Containers")
                ? "text-white bg-white/[0.03]"
                : "text-white/60"
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              {openSections.devcontainer ? (
                <ChevronDown className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
              )}
              <span className="truncate">Dev Containers (Antigravity)</span>
            </div>

            {devContainers.length > 0 && (
              <span className="text-[10px] text-white/30 px-1.5 py-0.2 rounded bg-white/5">
                {devContainers.length}
              </span>
            )}
          </div>

          {openSections.devcontainer && (
            <div className="bg-black/20 py-1">
              {devContainers.length === 0 ? (
                <p className="px-6 py-3 text-white/40 text-[11px] italic leading-relaxed">
                  There is no data provider registered that can provide view data.
                </p>
              ) : (
                devContainers.map((t) => (
                  <TargetRow
                    key={t.id}
                    target={t}
                    icon={<Box className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                    onConnect={() => handleConnect(t)}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Section 2: SSH (Antigravity) */}
        <div className="border-b border-white/5">
          <div className="flex items-center justify-between px-3 py-1.5 hover:bg-white/5 text-[11px] font-bold tracking-wider transition">
            <div
              onClick={() => toggleSection("ssh")}
              className={`flex items-center gap-1.5 flex-1 cursor-pointer truncate ${
                selectedProvider.startsWith("SSH") ? "text-white" : "text-white/60"
              }`}
            >
              {openSections.ssh ? (
                <ChevronDown className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
              )}
              <span className="truncate">SSH (Antigravity)</span>
              {sshHosts.length > 0 && (
                <span className="text-[10px] text-white/30 px-1.5 py-0.2 rounded bg-white/5">
                  {sshHosts.length}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setOpenSections((prev) => ({ ...prev, ssh: true }));
                setIsAddingSsh(!isAddingSsh);
              }}
              className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition"
              title="Add New SSH Host..."
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {openSections.ssh && (
            <div className="bg-black/20 py-1">
              {isAddingSsh && (
                <form
                  onSubmit={handleAddSshHost}
                  className="mx-3 my-2 p-2.5 bg-[#1e1e1e] border border-white/10 rounded-md space-y-2"
                >
                  <div className="text-[11px] font-semibold text-white/80">Configure SSH Target</div>
                  <div>
                    <input
                      type="text"
                      value={sshHostInput}
                      onChange={(e) => setSshHostInput(e.target.value)}
                      placeholder="Hostname / IP (e.g. 192.168.1.100 or myserver.com)"
                      autoFocus
                      className="w-full bg-[#121212] border border-white/10 rounded px-2 py-1 text-white text-[11px] outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={sshUserInput}
                      onChange={(e) => setSshUserInput(e.target.value)}
                      placeholder="User (default: root)"
                      className="flex-1 bg-[#121212] border border-white/10 rounded px-2 py-1 text-white text-[11px] outline-none focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={sshPortInput}
                      onChange={(e) => setSshPortInput(e.target.value)}
                      placeholder="Port (22)"
                      className="w-16 bg-[#121212] border border-white/10 rounded px-2 py-1 text-white text-[11px] outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingSsh(false)}
                      className="px-2 py-1 rounded text-white/50 hover:text-white text-[10px]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-2.5 py-1 rounded bg-[#0e639c] hover:bg-[#1177bb] text-white text-[10px] font-medium"
                    >
                      Add Host
                    </button>
                  </div>
                </form>
              )}

              {sshHosts.length === 0 && !isAddingSsh ? (
                <div className="px-6 py-3 text-white/40 text-[11px] flex flex-col gap-1.5">
                  <p className="italic">No SSH hosts configured.</p>
                  <button
                    type="button"
                    onClick={() => setIsAddingSsh(true)}
                    className="text-[#3794ff] hover:underline text-left text-[11px] cursor-pointer bg-transparent border-none p-0"
                  >
                    + Add New SSH Host...
                  </button>
                </div>
              ) : (
                sshHosts.map((t) => (
                  <TargetRow
                    key={t.id}
                    target={t}
                    icon={<Server className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />}
                    onConnect={() => handleConnect(t)}
                    onRemove={
                      customSshHosts.some((h) => h.id === t.id)
                        ? () => handleRemoveSshHost(t.id, t.name)
                        : undefined
                    }
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Section 3: WSL Targets (Antigravity) */}
        <div className="border-b border-white/5">
          <div
            onClick={() => toggleSection("wsl")}
            className={`flex items-center justify-between px-3 py-1.5 hover:bg-white/5 cursor-pointer text-[11px] font-bold tracking-wider transition ${
              selectedProvider.startsWith("WSL") ? "text-white bg-white/[0.03]" : "text-white/60"
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              {openSections.wsl ? (
                <ChevronDown className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
              )}
              <span className="truncate">WSL Targets (Antigravity)</span>
            </div>

            {wslTargets.length > 0 && (
              <span className="text-[10px] text-white/30 px-1.5 py-0.2 rounded bg-white/5">
                {wslTargets.length}
              </span>
            )}
          </div>

          {openSections.wsl && (
            <div className="bg-black/20 py-1">
              {wslTargets.length === 0 ? (
                <p className="px-6 py-3 text-white/40 text-[11px] italic">
                  No WSL distributions detected.
                </p>
              ) : (
                wslTargets.map((t) => (
                  <TargetRow
                    key={t.id}
                    target={t}
                    icon={<Monitor className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                    onConnect={() => handleConnect(t)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Info / Status bar */}
      <div className="p-2 border-t border-white/5 bg-white/[0.01] text-[10px] text-white/40 flex items-center justify-between">
        <span className="truncate">
          {workspaceId ? `Workspace: ${workspaceId.slice(0, 8)}` : "Local Web Sandbox"}
        </span>
        <span className="text-emerald-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
          Ready
        </span>
      </div>
    </div>
  );
}

function TargetRow({
  target,
  icon,
  onConnect,
  onRemove,
}: {
  target: RemoteTarget;
  icon: React.ReactNode;
  onConnect?: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className="group flex items-center justify-between px-4 py-1.5 hover:bg-white/5 transition rounded mx-1">
      <div
        onClick={onConnect}
        className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
        title={`Click to connect: ${target.name}`}
      >
        {icon}
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-white/80 group-hover:text-white font-mono text-[11px] truncate">
            {target.name}
          </span>
          {target.details && (
            <span className="text-white/40 text-[10px] truncate">{target.details}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            target.status === "connected"
              ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
              : target.status === "available"
              ? "bg-blue-400"
              : "bg-white/30"
          }`}
          title={`Status: ${target.status}`}
        />

        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition">
          {onConnect && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onConnect();
              }}
              className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition"
              title="Connect / Open Terminal"
            >
              <Terminal className="w-3 h-3" />
            </button>
          )}

          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-1 rounded text-white/40 hover:text-red-400 hover:bg-white/10 transition"
              title="Delete SSH Target"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default RemoteExplorerPanel;
