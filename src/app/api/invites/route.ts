import { NextRequest, NextResponse } from "next/server";
import { requireMissionOwner } from "@/lib/authorization";
import { createInvite } from "@/lib/mission-store";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    missionId?: string;
    name?: string;
    email?: string;
    expiresAt?: string;
  };
  if (!body.missionId || !body.name?.trim() || !body.email?.includes("@")) {
    return NextResponse.json({ error: "Name, email, and mission are required" }, { status: 400 });
  }

  const authorization = await requireMissionOwner(body.missionId);
  if ("error" in authorization) return authorization.error;
  if (authorization.mission.entitlement.state !== "active") {
    return NextResponse.json({ error: "Unlock the Family Mission Room before inviting guests" }, { status: 403 });
  }

  const grant = await createInvite({
    missionId: body.missionId,
    name: body.name.trim(),
    email: body.email.trim(),
    expiresAt: body.expiresAt ?? "30 days after return",
  });

  return NextResponse.json({ grant }, { status: 201 });
}
