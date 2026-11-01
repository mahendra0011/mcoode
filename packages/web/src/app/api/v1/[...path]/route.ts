import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3100";

async function handleProxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const subPath = (resolvedParams?.path || []).join("/");
  const targetUrl = `${BACKEND_URL}/api/v1/${subPath}${req.nextUrl.search}`;
  const controller = new AbortController();
  // Uploads can contain a full project archive and are explicitly allowed
  // more time by the backend. The old fixed 3s proxy deadline made those
  // otherwise-valid requests fail before the backend's upload timeout.
  const timeoutMs = subPath.split("/")[0] === "uploads" ? 10 * 60 * 1000 : 30_000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = new Headers(req.headers);
    headers.delete("host");

    const backendRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== "GET" && req.method !== "HEAD" ? await req.blob() : undefined,
      signal: controller.signal,
    });
    const data = await backendRes.blob();
    return new NextResponse(data, {
      status: backendRes.status,
      headers: backendRes.headers,
    });
  } catch {
    // Graceful fallback when backend is offline so Next.js never crashes
    if (subPath === "version") {
      return NextResponse.json({ version: "2.4.6" });
    }
    if (subPath === "keys") {
      return NextResponse.json({ keys: [] });
    }
    if (subPath === "settings") {
      return NextResponse.json({ settings: { accentColor: "emerald" } });
    }
    if (subPath === "auth/me") {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    return NextResponse.json({ ok: false, message: "Backend service offline" }, { status: 503 });
  } finally {
    clearTimeout(timeoutId);
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const PATCH = handleProxy;
