import { NextRequest, NextResponse } from "next/server";
import { requireMissionOwner } from "@/lib/authorization";
import { revokeInvite } from "@/lib/mission-store";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { missionId?: string; grantId?: string };
  if (!body.missionId || !body.grantId) {
    return NextResponse.json({ error: "Mission and invite are required" }, { status: 400 });
  }

  const authorization = await requireMissionOwner(body.missionId);
  if ("error" in authorization) return authorization.error;

  try {
    const grant = await revokeInvite({ missionId: body.missionId, grantId: body.grantId });
    return NextResponse.json({ grant });
  } catch {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
}
