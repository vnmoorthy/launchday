import { NextRequest, NextResponse } from "next/server";
import { activateInvite, getMission } from "@/lib/mission-store";
import { getCurrentViewer } from "@/lib/viewer";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const missionId = request.nextUrl.searchParams.get("missionId") ?? "mission_maya_01";
  const [mission, viewer] = await Promise.all([getMission(missionId), getCurrentViewer()]);
  if (!viewer) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const ownerOrOperator = viewer.id === mission.passenger.id || viewer.role === "operator";
  const guestGrant = ownerOrOperator
    ? null
    : await activateInvite({ missionId, email: viewer.email });
  const hasAccess = ownerOrOperator || (mission.entitlement.state === "active" && Boolean(guestGrant));
  if (!hasAccess) {
    return NextResponse.json({ error: "Mission access not granted" }, { status: 403 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) {
    return NextResponse.json({ fallback: "browser-speech", text: mission.story.narration });
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: mission.story.narration,
        model_id: "eleven_flash_v2_5",
      }),
    },
  );

  if (!response.ok || !response.body) {
    return NextResponse.json({ error: "Narration is temporarily unavailable" }, { status: 502 });
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
