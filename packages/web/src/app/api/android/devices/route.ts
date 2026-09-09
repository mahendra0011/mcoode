import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

export async function GET() {
  try {
    const { stdout } = await execAsync("emulator -list-avds", { timeout: 3000 });
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
