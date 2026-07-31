import { eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { missions } from "@/db/schema";
import { createDemoMission } from "@/lib/demo-data";
import type { AccessGrant, Mission, MissionImage } from "@/lib/types";

type MemoryState = {
  missions: Map<string, Mission>;
};

declare global {
  var launchDayMemory: MemoryState | undefined;
}

function memory() {
  if (!globalThis.launchDayMemory) {
    globalThis.launchDayMemory = {
      missions: new Map([["mission_maya_01", createDemoMission()]]),
    };
  }

  return globalThis.launchDayMemory;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

async function hydrateFromDatabase(missionId: string) {
  const database = getDatabase();
  if (!database) return null;

  try {
    const [record] = await database
      .select({ data: missions.data })
      .from(missions)
      .where(eq(missions.id, missionId))
      .limit(1);

    return record?.data ?? null;
  } catch {
    return null;
  }
}

async function persist(mission: Mission) {
  memory().missions.set(mission.id, clone(mission));
  const database = getDatabase();
  if (!database) return;

  try {
    await database
      .insert(missions)
      .values({ id: mission.id, passengerUserId: mission.passenger.id, data: mission })
      .onConflictDoUpdate({
        target: missions.id,
        set: { data: mission, updatedAt: new Date() },
      });
  } catch {
    return;
  }
}

export async function getMission(missionId = "mission_maya_01") {
  const persisted = await hydrateFromDatabase(missionId);
  if (persisted) {
    memory().missions.set(missionId, clone(persisted));
    return clone(persisted);
  }

  const mission = memory().missions.get(missionId) ?? createDemoMission();
  memory().missions.set(missionId, clone(mission));
  return clone(mission);
}

export async function activateEntitlement(input: {
  missionId: string;
  payerName?: string;
  payerEmail?: string;
  checkoutSessionId?: string;
}) {
  const mission = await getMission(input.missionId);
  mission.entitlement = {
    ...mission.entitlement,
    state: "active",
    payerName: input.payerName ?? "A mission sponsor",
    payerEmail: input.payerEmail,
    checkoutSessionId: input.checkoutSessionId,
    activatedAt: new Date().toISOString(),
  };
  await persist(mission);
  return mission;
}

export async function createInvite(input: {
  missionId: string;
  name: string;
  email: string;
  expiresAt: string;
}) {
  const mission = await getMission(input.missionId);
  const grant: AccessGrant = {
    id: `grant_${crypto.randomUUID()}`,
    name: input.name,
    email: input.email.toLowerCase(),
    role: "family",
    status: "invited",
    expiresAt: input.expiresAt,
    createdAt: new Date().toISOString(),
  };
  mission.accessGrants = [...mission.accessGrants, grant];
  await persist(mission);
  return grant;
}

export async function revokeInvite(input: { missionId: string; grantId: string }) {
  const mission = await getMission(input.missionId);
  const grant = mission.accessGrants.find((candidate) => candidate.id === input.grantId);
  if (!grant) {
    throw new Error("Invite not found");
  }

  grant.status = "revoked";
  await persist(mission);
  return grant;
}

export async function activateInvite(input: { missionId: string; email: string }) {
  const mission = await getMission(input.missionId);
  const grant = mission.accessGrants.find(
    (candidate) => candidate.email.toLowerCase() === input.email.toLowerCase(),
  );
  if (!grant || grant.status === "revoked") {
    return null;
  }

  if (grant.status === "invited") {
    grant.status = "active";
    await persist(mission);
  }

  return grant;
}

export async function addImage(input: {
  missionId: string;
  url: string;
  label: string;
}) {
  const mission = await getMission(input.missionId);
  const image: MissionImage = {
    id: `image_${crypto.randomUUID()}`,
    url: input.url,
    label: input.label,
    uploadedAt: new Date().toISOString(),
  };
  mission.images = [...mission.images, image].slice(-5);
  await persist(mission);
  return image;
}

export async function saveStory(missionId: string, story: Mission["story"]) {
  const mission = await getMission(missionId);
  mission.story = story;
  await persist(mission);
  return mission.story;
}
