import { execFile } from "node:child_process";
import { requireApiAuth, assertNoShellMeta } from "@/lib/server/apiAuth";

/** M11-001: the id reaches a process argv, so it must be a plain AVD name.
 *  No shell is involved (execFile, not exec), so injection is structurally
 *  impossible; this pattern is defence in depth and rejects nonsense early. */
const AVD_NAME = /^[A-Za-z0-9._-]{1,64}$/;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // M11-002: every app/api route requires an authenticated caller.
    const auth = await requireApiAuth(req);
    if (!auth.ok) return auth.response;

    const resolvedParams = await params;
    const id = String(resolvedParams?.id ?? "");

    if (!AVD_NAME.test(id)) {
      return Response.json(
        { success: false, error: "Invalid emulator id" },
        { status: 400 }
      );
    }
    assertNoShellMeta(id);

    // M11-001: execFile passes argv directly — no shell ever parses `id`.
    await new Promise<void>((resolve, reject) => {
      execFile(
        "emulator",
        ["-avd", id],
        { timeout: 10_000, windowsHide: true },
        (err) => (err ? reject(err) : resolve())
      );
    });

    return Response.json({ success: true, started: true, id });
  } catch (err: any) {
    return Response.json(
      { success: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
