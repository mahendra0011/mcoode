"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Smartphone,
  Play,
  Square,
  RotateCw,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Cpu,
  Info,
} from "lucide-react";
import { useIDEStore } from "../../store/ideStore";
import { toast } from "sonner";

export interface AndroidDevice {
  id: string;
  name: string;
  status: "running" | "stopped" | "launching";
  apiLevel?: string;
}

const STORAGE_KEY = "antigravity_custom_android_avds";

const DEFAULT_SIMULATED_DEVICES: AndroidDevice[] = [
  { id: "Pixel_7_Pro_API_34", name: "Pixel_7_Pro_API_34", status: "stopped", apiLevel: "API 34" },
  { id: "Medium_Phone_API_33", name: "Medium_Phone_API_33", status: "stopped", apiLevel: "API 33" },
];

export function AndroidEmulatorsPanel() {
  const [devices, setDevices] = useState<AndroidDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [hostAvailable, setHostAvailable] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Load custom devices from localStorage
  const loadCustomDevices = (): AndroidDevice[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_SIMULATED_DEVICES;
  };

  const saveCustomDevices = (devs: AndroidDevice[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(devs));
    } catch {}
  };

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/android/devices");
      const data = await res.json();
      if (data.available && data.devices && data.devices.length > 0) {
        setHostAvailable(true);
        setDevices(data.devices);
      } else {
        setHostAvailable(false);
        // Fallback to custom/simulated devices
        setDevices(loadCustomDevices());
      }
    } catch {
      setHostAvailable(false);
      setDevices(loadCustomDevices());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleStart = async (device: AndroidDevice) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === device.id ? { ...d, status: "launching" } : d))
    );
    toast.info(`Launching ${device.name}...`);

    const runCmd = useIDEStore.getState().runTerminalCommandFn;
    if (runCmd) {
      runCmd(`emulator -avd ${device.id}`);
    }

    try {
      await fetch(`/api/android/devices/${encodeURIComponent(device.id)}/start`, {
        method: "POST",
      });
    } catch {}

    setTimeout(() => {
      setDevices((prev) =>
        prev.map((d) => (d.id === device.id ? { ...d, status: "running" } : d))
      );
      toast.success(`${device.name} is running`);
    }, 1200);
  };

  const handleStop = (device: AndroidDevice) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === device.id ? { ...d, status: "stopped" } : d))
    );
    toast.info(`Stopped ${device.name}`);
  };

  const handleAddDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName.trim()) return;

    const formatted = newDeviceName.trim().replace(/\s+/g, "_");
    const newDev: AndroidDevice = {
      id: formatted,
      name: formatted,
      status: "stopped",
      apiLevel: "Custom AVD",
    };

    const updated = [...devices, newDev];
    setDevices(updated);
    saveCustomDevices(updated);
    setNewDeviceName("");
    setIsAdding(false);
    toast.success(`Added virtual device: ${formatted}`);
  };

  const handleDeleteDevice = (id: string, name: string) => {
    const updated = devices.filter((d) => d.id !== id);
    setDevices(updated);
    saveCustomDevices(updated);
    toast.info(`Removed ${name}`);
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] text-white/80 select-none text-xs min-w-[240px] overflow-hidden">
      {/* Top Header */}
      <div className="p-2.5 border-b border-white/5 flex items-center justify-between gap-2 bg-[#181818]/90 flex-shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          <Smartphone className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="font-semibold uppercase tracking-wider text-white/60 text-[11px] truncate">
            ANDROID EMULATORS
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition"
            title="Register Virtual Device"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={fetchDevices}
            disabled={loading}
            className={`p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition ${
              loading ? "animate-spin text-blue-400" : ""
            }`}
            title="Refresh Devices"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Host SDK Status Pill */}
      <div className="px-3 py-1.5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between text-[10px] flex-shrink-0">
        <span className="text-white/40">Host SDK Status</span>
        {hostAvailable ? (
          <span className="text-emerald-400 flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
            Active SDK detected
          </span>
        ) : (
          <span className="text-amber-400/80 flex items-center gap-1">
            <Cpu className="w-3 h-3" />
            Virtual simulation mode
          </span>
        )}
      </div>

      {/* Inline Add Device Form */}
      {isAdding && (
        <form
          onSubmit={handleAddDevice}
          className="p-2.5 border-b border-white/5 bg-[#181818] space-y-2 flex-shrink-0"
        >
          <div className="text-[11px] font-medium text-white/80">Register AVD Name</div>
          <input
            type="text"
            value={newDeviceName}
            onChange={(e) => setNewDeviceName(e.target.value)}
            placeholder="e.g. Pixel_8_API_34"
            autoFocus
            className="w-full bg-[#121212] border border-white/10 rounded px-2 py-1 text-white text-[11px] outline-none focus:border-blue-500"
          />
          <div className="flex justify-end gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-2 py-0.5 rounded text-white/40 hover:text-white text-[10px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-2.5 py-0.5 rounded bg-[#0e639c] hover:bg-[#1177bb] text-white text-[10px] font-medium"
            >
              Add Device
            </button>
          </div>
        </form>
      )}

      {/* Devices List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-2 flex flex-col gap-1.5">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-white/40">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span>Scanning for AVDs...</span>
          </div>
        ) : devices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-white/40 px-4">
            <Smartphone className="w-8 h-8 text-white/20 mb-2" />
            <p className="text-xs mb-1 font-medium">No Android emulators found.</p>
            <p className="text-[11px] text-white/30 leading-relaxed mb-3">
              Ensure the Android SDK and `emulator` tool are in your system PATH.
            </p>
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="px-3 py-1 bg-[#0e639c] hover:bg-[#1177bb] text-white rounded text-xs transition"
            >
              + Register AVD
            </button>
          </div>
        ) : (
          devices.map((d) => (
            <div
              key={d.id}
              className="p-2 rounded border border-white/5 bg-black/20 hover:bg-white/[0.04] transition flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-base flex-shrink-0">📱</span>
                <div className="flex flex-col min-w-0">
                  <span className="font-mono text-white/90 text-[11px] truncate">{d.name}</span>
                  <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        d.status === "running"
                          ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                          : d.status === "launching"
                          ? "bg-amber-400 animate-pulse"
                          : "bg-white/20"
                      }`}
                    />
                    <span className="capitalize">{d.status}</span>
                    {d.apiLevel && <span className="text-white/20">• {d.apiLevel}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {d.status === "running" ? (
                  <button
                    type="button"
                    onClick={() => handleStop(d)}
                    className="p-1.5 rounded bg-red-600/20 hover:bg-red-600/40 text-red-400 transition"
                    title="Stop Emulator"
                  >
                    <Square className="w-3 h-3 fill-current" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStart(d)}
                    disabled={d.status === "launching"}
                    className="p-1.5 rounded bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 disabled:opacity-30 transition"
                    title="Start Emulator"
                  >
                    {d.status === "launching" ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Play className="w-3 h-3 fill-current" />
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDeleteDevice(d.id, d.name)}
                  className="p-1.5 rounded text-white/30 hover:text-red-400 hover:bg-white/10 transition"
                  title="Remove Device"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2 border-t border-white/5 bg-white/[0.01] text-[10px] text-white/30 flex items-center justify-between flex-shrink-0">
        <span className="truncate">CLI: emulator -avd &lt;name&gt;</span>
        <span className="text-white/20 font-mono">AVD Manager</span>
      </div>
    </div>
  );
}

export default AndroidEmulatorsPanel;
