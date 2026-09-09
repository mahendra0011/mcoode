"use client";
import { Suspense } from "react";
import { SettingsPage } from "../../views/SettingsPage";
export const dynamic = "force-dynamic";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <SettingsPage />
    </Suspense>
  );
}
