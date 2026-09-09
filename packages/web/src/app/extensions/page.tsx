"use client";

import ExtensionsMarketplace from "@/components/ExtensionsMarketplace";
import editorApi from "@/lib/extensions/editorApi";

export default function ExtensionsPage() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-[#1e1e1e]">
      <ExtensionsMarketplace editorApi={editorApi} />
    </div>
  );
}
