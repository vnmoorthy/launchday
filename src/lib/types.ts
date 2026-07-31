export type MissionRole = "passenger" | "family" | "operator" | "sponsor";
export type EntitlementState = "locked" | "active";

export type Viewer = {
  id: string;
  name: string;
  email: string;
  role: MissionRole;
  picture?: string;
  isDemo: boolean;
};

export type AccessGrant = {
  id: string;
  name: string;
  email: string;
  role: "family" | "operator";
  status: "invited" | "active" | "revoked";
  expiresAt: string;
  createdAt: string;
};

export type MissionImage = {
  id: string;
  url: string;
  label: string;
  uploadedAt: string;
};

export type FirstOrbitStory = {
  title: string;
  subtitle: string;
  narration: string;
  beats: Array<{ time: string; copy: string }>;
};

export type Mission = {
  id: string;
  passenger: { id: string; name: string; email: string };
  launchWindow: string;
  destination: string;
  readiness: number;
  completedSteps: number;
  totalSteps: number;
  entitlement: {
    state: EntitlementState;
    amountCents: number;
    currency: string;
    payerName?: string;
    payerEmail?: string;
    checkoutSessionId?: string;
    activatedAt?: string;
  };
  accessGrants: AccessGrant[];
  images: MissionImage[];
  story: FirstOrbitStory;
};

export type CheckoutRequest = {
  missionId: string;
  sponsorName?: string;
  sponsorEmail?: string;
};
