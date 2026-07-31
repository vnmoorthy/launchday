import { getCurrentViewer } from "@/lib/viewer";
import { getMission } from "@/lib/mission-store";

export async function requireMissionOwner(missionId: string) {
  const [viewer, mission] = await Promise.all([getCurrentViewer(), getMission(missionId)]);

  if (!viewer) {
    return { error: Response.json({ error: "Authentication required" }, { status: 401 }) };
  }

  if (viewer.id !== mission.passenger.id && viewer.role !== "operator") {
    return { error: Response.json({ error: "Only the passenger can change this mission" }, { status: 403 }) };
  }

  return { viewer, mission };
}
