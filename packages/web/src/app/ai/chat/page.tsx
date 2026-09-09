"use client";
import { Suspense } from "react";
import { AIChatPage } from "../../../views/AIChatPage";
export const dynamic = "force-dynamic";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AIChatPage />
    </Suspense>
  );
}
