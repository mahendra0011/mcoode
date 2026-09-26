import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

const BACKEND = process.env.BACKEND_URL || "http://localhost:3100";

export async function GET() {
  // Prefer the backend (dockerode, authed) — fall back to local CLI exec
  // for self-hosted desktop where the Next server shares the host.
  try {
    const res = await fetch(`${BACKEND}/api/v1/docker/containers`, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      signal: (AbortSignal as any).timeout(3000),
    } as RequestInit);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.containers)) return Response.json({ available: true, containers: data.containers, source: 'backend' });
    }
  } catch {}
  try {
    const { stdout } = await execAsync(
      'docker ps -a --format "{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.State}}\t{{.Ports}}"',
      { timeout: 3000 }
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
