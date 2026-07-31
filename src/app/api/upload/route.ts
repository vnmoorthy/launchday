import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { addImage, getMission } from "@/lib/mission-store";
import { getCurrentViewer } from "@/lib/viewer";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Vercel Blob is not configured" }, { status: 503 });
  }

  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const viewer = await getCurrentViewer();
        if (!viewer) throw new Error("Authentication required");
        const payload = JSON.parse(clientPayload ?? "{}") as { missionId?: string; label?: string };
        if (!payload.missionId) throw new Error("Mission is required");
        const mission = await getMission(payload.missionId);
        if (viewer.id !== mission.passenger.id && viewer.role !== "operator") {
          throw new Error("Only the passenger can add mission media");
        }

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumPayloadSize: 10 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            missionId: payload.missionId,
            label: payload.label ?? "Passenger memory",
            ownerId: viewer.id,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = JSON.parse(tokenPayload ?? "{}") as { missionId: string; label: string };
        await addImage({ missionId: payload.missionId, url: blob.url, label: payload.label });
      },
    });

    return NextResponse.json(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload authorization failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
