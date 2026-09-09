import { exec } from "child_process";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    // Launch emulator in detached background process on host
    exec(`emulator -avd ${id}`);

    return Response.json({ success: true, started: true, id });
  } catch (err: any) {
    return Response.json(
      { success: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
