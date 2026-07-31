import { NextRequest, NextResponse } from "next/server";
import { activateInvite, getMission } from "@/lib/mission-store";
import { getCurrentViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const missionId = request.nextUrl.searchParams.get("missionId") ?? "mission_maya_01";
  const [mission, viewer] = await Promise.all([getMission(missionId), getCurrentViewer()]);

  if (!viewer) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const ownerOrOperator =
    viewer.id === mission.passenger.id ||
    viewer.role === "operator";
  const guestGrant = ownerOrOperator
    ? null
    : await activateInvite({ missionId, email: viewer.email });
  const hasAccess = ownerOrOperator || (mission.entitlement.state === "active" && Boolean(guestGrant));

  if (!hasAccess) {
    return NextResponse.json({ error: "Mission access not granted" }, { status: 403 });
  }

  return NextResponse.json({ mission, viewer });
}
