import { NextResponse } from "next/server";
import { inferFrame } from "@/lib/inference";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(request.url);
  const camera = url.searchParams.get("camera") ?? "CAM-1";
  const frame = inferFrame(id, camera, true);
  if (!frame) {
    return NextResponse.json({ error: "conveyor not found" }, { status: 404 });
  }
  return NextResponse.json(frame);
}
