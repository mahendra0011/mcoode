"use client";
import React from "react";
import dynamic from "next/dynamic";

const AIChatPage = dynamic(
  () => import("./AIChatPage").then((mod) => mod.AIChatPage),
  {
    ssr: false,
    loading: () => (
      <div className="w-screen h-screen bg-[#0e0e0e] flex items-center justify-center text-white/50 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Loading mcode Web IDE...</span>
        </div>
      </div>
    ),
  }
);

export function WebIdePage() {
  return <AIChatPage />;
}
