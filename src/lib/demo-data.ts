import type { FirstOrbitStory, Mission, Viewer } from "@/lib/types";

export const DEMO_PASSENGER: Viewer = {
  id: "auth0|maya-chen",
  name: "Maya Chen",
  email: "maya@launchday.example",
  role: "passenger",
  isDemo: true,
};

export const DEMO_FAMILY: Viewer = {
  id: "auth0|lena-chen",
  name: "Lena Chen",
  email: "lena@launchday.example",
  role: "family",
  isDemo: true,
};

export const DEFAULT_STORY: FirstOrbitStory = {
  title: "First Orbit",
  subtitle: "A private record of the moment Earth becomes home.",
  narration:
    "At 10:42, Maya lifts her eyes from the cabin glass. The Pacific appears first—not as a map, but as a living field of blue. Her mother’s voice note is waiting below, and for one quiet minute, the people who made this possible are part of the view.",
  beats: [
    { time: "T−04:00", copy: "Maya completes her personal orientation and adds the people waiting below." },
    { time: "T+00:12", copy: "Earth rises into view. Her first orbit story begins as a private draft." },
    { time: "RETURN+01", copy: "The passenger chooses who can enter the finished Mission Room—and for how long." },
  ],
};

export function createDemoMission(): Mission {
  return {
    id: "mission_maya_01",
    passenger: {
      id: DEMO_PASSENGER.id,
      name: DEMO_PASSENGER.name,
      email: DEMO_PASSENGER.email,
    },
    launchWindow: "Oct 18, 2026 · 09:40 PT",
    destination: "Low Earth Orbit",
    readiness: 72,
    completedSteps: 3,
    totalSteps: 4,
    entitlement: {
      state: "locked",
      amountCents: 4900,
      currency: "usd",
    },
    accessGrants: [
      {
        id: "grant_lena",
        name: "Lena Chen",
        email: "lena@launchday.example",
        role: "family",
        status: "active",
        expiresAt: "Nov 18, 2026",
        createdAt: "Oct 02, 2026",
      },
      {
        id: "grant_zoe",
        name: "Zoe Patel",
        email: "zoe@launchday.example",
        role: "family",
        status: "invited",
        expiresAt: "Nov 18, 2026",
        createdAt: "Oct 04, 2026",
      },
    ],
    images: [],
    story: DEFAULT_STORY,
  };
}
