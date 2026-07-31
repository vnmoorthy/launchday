import { auth0 } from "@/lib/auth0";
import { DEMO_FAMILY, DEMO_PASSENGER } from "@/lib/demo-data";
import type { Viewer } from "@/lib/types";

export function isDemoMode() {
  return process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
}

export async function getCurrentViewer(): Promise<Viewer | null> {
  if (auth0) {
    const session = await auth0.getSession();
    if (session?.user) {
      return {
        id: session.user.sub,
        name: session.user.name ?? session.user.nickname ?? "LaunchDay passenger",
        email: session.user.email ?? "",
        picture: session.user.picture,
        role: "passenger",
        isDemo: false,
      };
    }
  }

  return isDemoMode() ? DEMO_PASSENGER : null;
}

export function getDemoViewer(role: "passenger" | "family") {
  return role === "family" ? DEMO_FAMILY : DEMO_PASSENGER;
}
