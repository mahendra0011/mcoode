import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

export async function GET() {
  try {
    const { stdout } = await execAsync(
      'docker images --format "{{.ID}}\t{{.Repository}}\t{{.Tag}}\t{{.Size}}"',
      { timeout: 3000 }
    );
    const lines = stdout.trim().split("\n").filter(Boolean);
    const images = lines.map((line) => {
      const [id, repository, tag, size] = line.split("\t");
      return {
        id: id || "",
        repository: repository || "<none>",
        tag: tag || "<none>",
        size: size || "0MB",
      };
    });

    return Response.json({ available: true, images });
  } catch (err: any) {
    return Response.json({
      available: false,
      images: [],
      message: "Docker daemon not running on host.",
    });
  }
}
