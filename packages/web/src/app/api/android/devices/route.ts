import { execFile } from "node:child_process";
import { promisify } from "util";
import { requireApiAuth } from "@/lib/server/apiAuth";

const execFileAsync = promisify(execFile);

/** M11-002: refuse anonymous callers — this shells out to the Android emulator CLI. */
export async function GET(req: Request) {
  try {
    const auth = await requireApiAuth(req);
    if (!auth.ok) return auth.response;

    const { stdout } = await execFileAsync("emulator", ["-list-avds"], {
      timeout: 3000,
      windowsHide: true,
    });
    const names = stdout
      .trim()
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    return Response.json({
      available: true,
      devices: names.map((name) => ({
        id: name,
        name,
        status: "stopped",
      })),
    });
  } catch (err: any) {
    // If emulator binary is not found on host, gracefully report unavailable
    return Response.json({
      available: false,
      devices: [],
      message: "Android SDK emulator CLI not detected on the host machine.",
    });
  }
}
