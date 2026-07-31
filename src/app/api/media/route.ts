import { get as getBlob } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { activateInvite, getMission } from "@/lib/mission-store";
import { getCurrentViewer } from "@/lib/viewer";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const missionId = request.nextUrl.searchParams.get("missionId");
  const imageId = request.nextUrl.searchParams.get("imageId");
  if (!missionId || !imageId) {
    return NextResponse.json({ error: "Mission and image are required" }, { status: 400 });
  }

  const [mission, viewer] = await Promise.all([getMission(missionId), getCurrentViewer()]);
  if (!viewer) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const ownerOrOperator = viewer.id === mission.passenger.id || viewer.role === "operator";
  const guestGrant = ownerOrOperator
    ? null
    : await activateInvite({ missionId, email: viewer.email });
  if (!ownerOrOperator && (mission.entitlement.state !== "active" || !guestGrant)) {
    return NextResponse.json({ error: "Mission access not granted" }, { status: 403 });
  }

  const image = mission.images.find((candidate) => candidate.id === imageId);
  if (!image || image.url.startsWith("blob:")) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  if (!image.url.includes(".private.blob.vercel-storage.com")) {
    return NextResponse.redirect(image.url);
  }

  const stored = await getBlob(image.url, { access: "private" });
  if (!stored || stored.statusCode !== 200) {
    return NextResponse.json({ error: "Image unavailable" }, { status: 404 });
  }

  return new Response(stored.stream, {
    headers: {
      "Content-Type": stored.blob.contentType,
      "Cache-Control": "private, max-age=120",
    },
  });
}
