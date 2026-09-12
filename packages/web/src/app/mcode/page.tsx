"use client";
import { Suspense } from "react";
import { McodeDashboard } from "../../components/pages/McodeDashboard";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <McodeDashboard />
    </Suspense>
  );
}
