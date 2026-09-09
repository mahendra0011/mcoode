import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

export async function GET() {
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

    return Response.json({ available: true, containers });
  } catch (err: any) {
    return Response.json({
      available: false,
      containers: [],
      message: "Docker daemon CLI not active or not running on host.",
    });
  }
}
