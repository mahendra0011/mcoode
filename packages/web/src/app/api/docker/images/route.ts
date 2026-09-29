import { execFile } from "node:child_process";
import { promisify } from "util";
import { requireApiAuth } from "@/lib/server/apiAuth";

const execFileAsync = promisify(execFile);

/** M11-002: refuse anonymous callers — this shells out to the host Docker CLI. */
export async function GET(req: Request) {
  try {
    const auth = await requireApiAuth(req);
    if (!auth.ok) return auth.response;

    const { stdout } = await execFileAsync(
      "docker",
      ["images", "--format", "{{.ID}}\t{{.Repository}}\t{{.Tag}}\t{{.Size}}"],
      { timeout: 3000, windowsHide: true }
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
