import { MissionControl } from "@/components/mission-control";
import { hasAuth0Configuration } from "@/lib/auth0";
import { activateInvite, getMission } from "@/lib/mission-store";
import { getCurrentViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [initialMission, viewer] = await Promise.all([getMission(), getCurrentViewer()]);

  if (!viewer) {
    return (
      <main className="auth-gate">
        <p className="eyebrow">LAUNCHDAY</p>
        <h1>Identity is required to enter this mission.</h1>
        <a className="primary-button" href="/auth/login">Continue with Auth0 <span>↗</span></a>
      </main>
    );
  }

  const isOwner = viewer.id === initialMission.passenger.id || viewer.role === "operator";
  const guestGrant = isOwner
    ? null
    : await activateInvite({ missionId: initialMission.id, email: viewer.email });

  if (!isOwner && (initialMission.entitlement.state !== "active" || !guestGrant)) {
    return (
      <main className="auth-gate">
        <p className="eyebrow">LAUNCHDAY</p>
        <h1>This mission room has not been shared with your identity.</h1>
        <p>Ask the passenger for a private invitation. Shared links never bypass consent.</p>
        <a className="primary-button" href="/auth/logout">Use another identity <span>↗</span></a>
      </main>
    );
  }

  const mission = await getMission(initialMission.id);
  return <MissionControl initialMission={mission} viewer={viewer} hasLiveAuth={hasAuth0Configuration} canManageMission={isOwner} />;
}
