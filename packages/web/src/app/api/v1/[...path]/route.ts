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
  const pathSegments = subPath.split("/");
  const isLongTransfer = pathSegments[0] === "uploads" ||
    (pathSegments[0] === "workspaces" && pathSegments.at(-1) === "export");
  const timeoutMs = isLongTransfer ? 10 * 60 * 1000 : 30_000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let streamingResponse = false;

  try {
    const headers = new Headers(req.headers);
    headers.delete("host");

    const backendRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== "GET" && req.method !== "HEAD" ? await req.blob() : undefined,
      signal: controller.signal,
    });
    const responseHeaders = new Headers(backendRes.headers);
    // Hop-by-hop headers describe the backend connection and must not leak
    // into the client connection. Fetch may also expose these after decoding.
    for (const name of ["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade"]) {
      responseHeaders.delete(name);
    }

    const body = backendRes.body;
    if (!body) {
      return new NextResponse(null, { status: backendRes.status, headers: responseHeaders });
    }

    const reader = body.getReader();
    const streamedBody = new ReadableStream<Uint8Array>({
      async pull(stream) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            clearTimeout(timeoutId);
            stream.close();
          } else {
            stream.enqueue(value);
          }
        } catch (error) {
          clearTimeout(timeoutId);
          stream.error(error);
        }
      },
      async cancel(reason) {
        clearTimeout(timeoutId);
        controller.abort(reason);
        await reader.cancel(reason).catch(() => {});
      },
    });
    streamingResponse = true;
    return new NextResponse(streamedBody, {
      status: backendRes.status,
      headers: responseHeaders,
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
    if (!streamingResponse) clearTimeout(timeoutId);
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const PATCH = handleProxy;
