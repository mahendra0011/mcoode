import { execFile } from "node:child_process";
import { promisify } from "util";
import { requireApiAuth } from "@/lib/server/apiAuth";
import { reportError } from "@/lib/logger";

const execFileAsync = promisify(execFile);

const BACKEND = process.env.BACKEND_URL || "http://localhost:3100";

/** M11-002: refuse anonymous callers — this shells out to the host Docker CLI. */
export async function GET(req: Request) {
  // Prefer the backend (dockerode, authed) — fall back to local CLI exec
  // for self-hosted desktop where the Next server shares the host.
  const auth = await requireApiAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const res = await fetch(`${BACKEND}/api/v1/docker/containers`, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      signal: (AbortSignal as any).timeout(3000),
    } as RequestInit);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.containers)) return Response.json({ available: true, containers: data.containers, source: 'backend' });
    }
  } catch (err) {
    // Backend unreachable is expected and non-fatal: we fall back to the
    // local Docker CLI. Log it rather than swallowing it (WEB-015).
    reportError('docker.containers.backend', err, { userVisible: false });
  }
  try {
    const { stdout } = await execFileAsync(
      "docker",
      ["ps", "-a", "--format", "{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.State}}\t{{.Ports}}"],
      { timeout: 3000, windowsHide: true }
    );
    const lines = stdout.trim().split("\n").filter(Boolean);
    const containers = lines.map((line) => {
      const [id, name, image, status, ports] = line.split("\t");
      return {
        id: id || "",
        name: name || "container",
        image: image || "",
        status: status === "running" ? "running" : "stopped",
        ports: ports ? ports.split(",").map((p) => p.trim()) : [],
      };
    });

    return Response.json({ available: true, containers, source: 'local' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Docker daemon CLI not active or not running on host.";
    return Response.json({
      available: false,
      containers: [],
      message,
    });
  }
}
