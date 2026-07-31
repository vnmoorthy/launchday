"use client";

import { upload } from "@vercel/blob/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AccessGrant, Mission, Viewer } from "@/lib/types";

type SponsorMode = "self" | "sponsor";

function amount(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function mediaSource(missionId: string, image: Mission["images"][number]) {
  return image.url.startsWith("blob:")
    ? image.url
    : `/api/media?missionId=${encodeURIComponent(missionId)}&imageId=${encodeURIComponent(image.id)}`;
}

async function responseError(response: Response) {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error ?? "Something interrupted the mission. Please try again.";
}

export function MissionControl({
  initialMission,
  viewer,
  hasLiveAuth,
  canManageMission,
}: {
  initialMission: Mission;
  viewer: Viewer;
  hasLiveAuth: boolean;
  canManageMission: boolean;
}) {
  const [mission, setMission] = useState(initialMission);
  const [sponsorMode, setSponsorMode] = useState<SponsorMode>("sponsor");
  const [showCheckout, setShowCheckout] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isNarrating, setIsNarrating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isUnlocked = mission.entitlement.state === "active";
  const activeGuests = mission.accessGrants.filter((grant) => grant.status === "active").length;
  const pendingGuests = mission.accessGrants.filter((grant) => grant.status === "invited").length;
  const issuedSeats = mission.accessGrants.filter((grant) => grant.status !== "revoked").length;
  const sponsor = useMemo(
    () =>
      sponsorMode === "self"
        ? { name: mission.passenger.name, email: mission.passenger.email }
        : { name: "Evelyn Chen", email: "evelyn@launchday.example" },
    [mission.passenger.email, mission.passenger.name, sponsorMode],
  );

  const refreshMission = useCallback(async () => {
    const response = await fetch(`/api/missions?missionId=${mission.id}`, { cache: "no-store" });
    if (!response.ok) return;
    const payload = (await response.json()) as { mission: Mission };
    setMission(payload.mission);
  }, [mission.id]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("checkout") !== "success") return;
    const timeout = window.setTimeout(() => {
      setToast("Payment received. Waiting for the verified Stripe webhook to activate the room.");
      void refreshMission();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [refreshMission]);

  async function beginCheckout() {
    setError(null);
    setIsCheckingOut(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          missionId: mission.id,
          sponsorName: sponsor.name,
          sponsorEmail: sponsor.email,
        }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const payload = (await response.json()) as { checkoutUrl?: string; demo?: boolean; mission?: Mission };
      if (payload.checkoutUrl) {
        window.location.assign(payload.checkoutUrl);
        return;
      }
      if (payload.mission) setMission(payload.mission);
      setShowCheckout(false);
      setToast("Entitlement activated. The payer funded Maya’s memory—without receiving access.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to start checkout");
    } finally {
      setIsCheckingOut(false);
    }
  }

  async function inviteGuest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsInviting(true);
    try {
      const response = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionId: mission.id, name: inviteName, email: inviteEmail }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const payload = (await response.json()) as { grant: AccessGrant };
      setMission((current) => ({ ...current, accessGrants: [...current.accessGrants, payload.grant] }));
      setInviteName("");
      setInviteEmail("");
      setToast(`${payload.grant.name} is invited. They gain nothing until Maya chooses to activate access.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create invite");
    } finally {
      setIsInviting(false);
    }
  }

  async function revokeGuest(grantId: string) {
    setError(null);
    const response = await fetch("/api/invites/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ missionId: mission.id, grantId }),
    });
    if (!response.ok) {
      setError(await responseError(response));
      return;
    }
    const payload = (await response.json()) as { grant: AccessGrant };
    setMission((current) => ({
      ...current,
      accessGrants: current.accessGrants.map((grant) => (grant.id === grantId ? payload.grant : grant)),
    }));
    setToast(`${payload.grant.name}'s access has been revoked. The payment and Maya’s ownership remain unchanged.`);
  }

  async function generateStory() {
    setError(null);
    setIsGenerating(true);
    try {
      const response = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionId: mission.id }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const payload = (await response.json()) as { story: Mission["story"]; demo?: boolean };
      setMission((current) => ({ ...current, story: payload.story }));
      setToast(payload.demo ? "First Orbit refreshed using the local mission fallback." : "A private First Orbit story is ready.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to generate story");
    } finally {
      setIsGenerating(false);
    }
  }

  async function playNarration() {
    setError(null);
    setIsNarrating(true);
    try {
      const response = await fetch(`/api/narration?missionId=${mission.id}`);
      if (!response.ok) throw new Error(await responseError(response));
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("audio/mpeg")) {
        const url = URL.createObjectURL(await response.blob());
        audioRef.current?.pause();
        audioRef.current = new Audio(url);
        audioRef.current.onended = () => {
          URL.revokeObjectURL(url);
          setIsNarrating(false);
        };
        await audioRef.current.play();
        return;
      }
      const payload = (await response.json()) as { fallback?: string; text?: string };
      if (payload.fallback === "browser-speech" && payload.text && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(payload.text);
        utterance.rate = 0.92;
        utterance.onend = () => setIsNarrating(false);
        window.speechSynthesis.speak(utterance);
        return;
      }
      throw new Error("Narration is unavailable in this browser");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to play narration");
      setIsNarrating(false);
    }
  }

  async function uploadMemory(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setIsUploading(true);
    try {
      if (process.env.NEXT_PUBLIC_VERCEL_BLOB_ENABLED === "true") {
        await upload(`missions/${mission.id}/${file.name}`, file, {
          access: "private",
          handleUploadUrl: "/api/upload",
          clientPayload: JSON.stringify({ missionId: mission.id, label: file.name }),
        });
        await refreshMission();
        setToast("Memory uploaded directly to Vercel Blob and attached to this private mission.");
      } else {
        const preview = URL.createObjectURL(file);
        setMission((current) => ({
          ...current,
          images: [
            ...current.images,
            { id: `local_${crypto.randomUUID()}`, url: preview, label: file.name, uploadedAt: new Date().toISOString() },
          ].slice(-5),
        }));
        setToast("Local memory attached for this demo. Connect Vercel Blob to persist it.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to upload memory");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  return (
    <main className="mission-shell">
      <div className="star-field" aria-hidden="true" />
      <header className="topbar shell-width">
        <a className="wordmark" href="#mission-control" aria-label="LaunchDay home">
          <span className="wordmark-mark" /> LAUNCHDAY
        </a>
        <nav className="topbar-nav" aria-label="Mission navigation">
          <a className="active" href="#mission-control">Mission</a>
          <a href="#mission-room">Room</a>
          <a href="#first-orbit">First Orbit</a>
        </nav>
        <div className="account-cluster">
          <div className="topbar-status"><span className="live-dot" /><span>{viewer.isDemo ? "DEMO MISSION" : "SECURE MISSION"}</span></div>
          <span className="profile-avatar" aria-hidden="true">{viewer.name.slice(0, 1)}</span>
          {hasLiveAuth ? <a className="profile-link" href="/auth/logout">Sign out</a> : <span className="profile-link">{viewer.name}</span>}
        </div>
      </header>

      <section className="hero shell-width" id="mission-control">
        <div className="hero-copy">
          <div className="mission-id"><span className="mission-id-dot" /> MISSION LEO-01 <i /> {mission.destination.toUpperCase()}</div>
          <p className="eyebrow">PASSENGER-CONTROLLED EXPERIENCE</p>
          <h1>Your story begins<br />before liftoff.</h1>
          <p className="hero-text">
            LaunchDay turns a passenger’s first orbit into a private, narrated memory—owned by the person who lived it.
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => setShowCheckout(true)} disabled={isUnlocked || !canManageMission}>
              {isUnlocked ? (canManageMission ? "Mission Room unlocked" : "Family access active") : "Unlock Family Mission Room"}
              <span aria-hidden="true">↗</span>
            </button>
            <a className="quiet-link" href="#first-orbit">View First Orbit <span aria-hidden="true">↓</span></a>
          </div>
          <div className="hero-footnote">
            <span className="tiny-rule" />
            <p>Not safety training. Not public social media. A consent-first memory layer for a once-in-a-lifetime experience.</p>
          </div>
        </div>

        <div className="orbit-stage" aria-label="Earth at night, photographed from orbit">
          <div className="scene-caption"><span className="live-dot" /> ISS NIGHT PASS · PRIVATE PREVIEW</div>
          <div className="orbit-sighting" aria-hidden="true"><span>01</span><i /> EARTH / NIGHT / 400KM</div>
          <div className="orbit-console">
            <div className="orbit-console-top"><span>MISSION PULSE</span><strong>T−49 DAYS</strong></div>
            <div className="orbit-console-body"><div className="orbit-progress"><i style={{ width: `${mission.readiness}%` }} /></div><strong>{mission.readiness}% ready</strong></div>
            <div className="orbit-console-next"><span>NEXT</span><p>{mission.images.length > 0 ? "Review personal story input" : "Add the memory that matters"}</p><b>→</b></div>
          </div>
          <div className="window-frame"><i /><i /><i /><i /></div>
        </div>
      </section>

      <section className="signal-strip shell-width" aria-label="Mission status">
        <div><span>PASSENGER</span><strong>{mission.passenger.name}</strong><small>Policy owner</small></div>
        <div><span>LAUNCH WINDOW</span><strong>{mission.launchWindow}</strong></div>
        <div className="readiness-cell"><span>READINESS</span><strong>{mission.completedSteps}/{mission.totalSteps} complete</strong><div className="mini-progress"><i style={{ width: `${mission.readiness}%` }} /></div></div>
        <div><span>MISSION ROOM</span><strong>{isUnlocked ? "Active · private" : "Waiting for unlock"}</strong><small>{activeGuests} active guest{activeGuests === 1 ? "" : "s"}</small></div>
      </section>

      {toast && <div className="toast shell-width" role="status"><span>✓</span>{toast}<button onClick={() => setToast(null)} aria-label="Dismiss notification">×</button></div>}
      {error && <div className="error-banner shell-width" role="alert"><span>!</span>{error}<button onClick={() => setError(null)} aria-label="Dismiss error">×</button></div>}

      <section className="mission-workspace shell-width" id="mission-room">
        <div className="workspace-heading">
          <div><p className="eyebrow">MISSION WORKSPACE</p><h2>Everything stays with the passenger.</h2></div>
          <p>Value, identity, and audience are intentionally separate. That is the difference between a purchase and a private experience.</p>
        </div>
        <div className="dashboard-grid">
          <article className="panel entitlement-panel">
          <div className="panel-head">
            <div><p className="eyebrow">THE COMMERCE MODEL</p><h2>Consent Checkout</h2></div>
            <span className={`status-pill ${isUnlocked ? "is-active" : ""}`}>{isUnlocked ? "ACTIVE" : "LOCKED"}</span>
          </div>
          <p className="panel-intro">A payment creates a right—not an audience. The passenger controls who enters their story.</p>
          <div className="consent-flow">
            <div className="role-node payer-node"><span className="node-number">01</span><strong>Payer</strong><small>{isUnlocked ? mission.entitlement.payerName : "Evelyn Chen"}</small><em>Funds the moment</em></div>
            <span className="arrow-line" aria-hidden="true">→</span>
            <div className="role-node beneficiary-node"><span className="node-number">02</span><strong>Beneficiary</strong><small>{mission.passenger.name}</small><em>Owns the memory</em></div>
            <span className="arrow-line" aria-hidden="true">→</span>
            <div className="role-node audience-node"><span className="node-number">03</span><strong>Audience</strong><small>{isUnlocked ? "Maya chooses" : "No automatic access"}</small><em>Sees only consented moments</em></div>
          </div>
          <div className="receipt-row">
            <div><span>FAMILY MISSION ROOM</span><strong>{amount(mission.entitlement.amountCents)} one-time</strong></div>
            <p>{isUnlocked ? "Paid entitlement active. Access policy remains Maya’s alone." : "The payer receives a receipt—not a key to Maya’s story."}</p>
          </div>
          </article>

          <article className="panel mission-room-panel">
          <div className="panel-head">
            <div><p className="eyebrow">AUTH0-BOUND ACCESS</p><h2>Family Mission Room</h2></div>
            <span className="privacy-lock">◉ PRIVATE</span>
          </div>
          <div className="room-capacity"><span><b>{issuedSeats}</b> / 3 family seats assigned</span><span>{pendingGuests > 0 ? `${pendingGuests} awaiting acceptance` : "All guests confirmed"}</span></div>
          <p className="panel-intro">Invite people by identity. Every guest receives time-bound, revocable access—never a shared password.</p>
          <form className="invite-form" onSubmit={inviteGuest}>
            <input value={inviteName} onChange={(event) => setInviteName(event.target.value)} placeholder="Guest name" aria-label="Guest name" disabled={!isUnlocked || isInviting || !canManageMission} />
            <input value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="guest@email.com" aria-label="Guest email" type="email" disabled={!isUnlocked || isInviting || !canManageMission} />
            <button className="outline-button" disabled={!isUnlocked || isInviting || !canManageMission}>{isInviting ? "Inviting…" : "Invite"}</button>
          </form>
          <div className="guest-list">
            {mission.accessGrants.map((grant) => (
              <div className="guest-row" key={grant.id}>
                <div className="guest-avatar">{grant.name.slice(0, 1)}</div>
                <div className="guest-identity"><strong>{grant.name}</strong><span>{grant.email}</span></div>
                <div className={`grant-status ${grant.status}`}>{grant.status}</div>
                <button className="revoke-button" disabled={!isUnlocked || !canManageMission || grant.status === "revoked"} onClick={() => revokeGuest(grant.id)}>{grant.status === "revoked" ? "Revoked" : "Revoke"}</button>
              </div>
            ))}
          </div>
          </article>
        </div>
      </section>

      <section className="first-orbit shell-width" id="first-orbit">
        <div className="story-visual">
          <div className="story-photo"><div className="story-horizon" /><div className="story-continent" /><div className="story-stars" /></div>
          <div className="story-flag">PRIVATE · PASSENGER-CONTROLLED</div>
          <div className="story-orbit-mark">01<br /><span>ORBIT</span></div>
        </div>
        <article className="story-copy">
          <div className="story-meta"><span>FIRST ORBIT RECORD</span><span>{mission.images.length}/5 PERSONAL MEMORIES</span></div>
          <p className="eyebrow">THE MOMENT THAT REMAINS</p>
          <h2>{mission.story.title}</h2>
          <p className="story-subtitle">{mission.story.subtitle}</p>
          <blockquote>“{mission.story.narration}”</blockquote>
          <div className="story-actions">
            <button className="play-button" onClick={playNarration} disabled={isNarrating}>{isNarrating ? "Narrating…" : "▶ Listen to Maya’s story"}</button>
            <button className="text-button" onClick={generateStory} disabled={isGenerating || !canManageMission}>{isGenerating ? "Rewriting…" : "Regenerate narrative ↻"}</button>
          </div>
          <div className="story-timeline">
            {mission.story.beats.map((beat) => <div key={beat.time}><span>{beat.time}</span><p>{beat.copy}</p></div>)}
          </div>
        </article>
      </section>

      <section className="memory-section shell-width">
        <div className="memory-copy"><p className="eyebrow">A PRIVATE INPUT, NOT A PUBLIC FEED</p><h2>Bring the people below into the moment above.</h2><p>Upload up to five memories to shape the passenger’s personal story. In live mode, files upload directly from the browser to Vercel Blob.</p></div>
        <div className="memory-upload">
          <input ref={fileInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadMemory} />
          <button className="upload-zone" onClick={() => fileInput.current?.click()} disabled={isUploading || !canManageMission}>
            <span className="upload-plus">+</span><strong>{isUploading ? "Uploading memory…" : "Add a private memory"}</strong><small>JPG, PNG, or WebP · max 10MB</small>
          </button>
          <div className="memory-thumbnails">
            {mission.images.length === 0 ? <span className="empty-memory">No media shared yet. The story can still begin.</span> : mission.images.map((image) => <img key={image.id} src={mediaSource(mission.id, image)} alt={image.label} />)}
          </div>
        </div>
      </section>

      <section className="principles shell-width">
        <div><span className="principle-number">01</span><h3>Payment does not grant access.</h3><p>Stripe verifies value. LaunchDay mints an entitlement for the passenger—not the cardholder.</p></div>
        <div><span className="principle-number">02</span><h3>Identity controls the audience.</h3><p>Auth0-backed identities make every invite specific, accountable, time-bound, and revocable.</p></div>
        <div><span className="principle-number">03</span><h3>Human before hype.</h3><p>LaunchDay is an orientation and memory layer. It never claims to clear someone for flight.</p></div>
      </section>

      <footer className="footer shell-width"><span>LAUNCHDAY</span><p>Built for the first generation of civilian astronauts.</p><span>AUTH0 × STRIPE</span></footer>

      {showCheckout && (
        <div className="modal-backdrop" role="presentation">
          <div className="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
            <button className="modal-close" onClick={() => setShowCheckout(false)} aria-label="Close checkout">×</button>
            <p className="eyebrow">ENTITLEMENT CHECKOUT</p>
            <div className="checkout-steps"><span className="done">01 Funding</span><i /><span className="done">02 Verify</span><i /><span>03 Consent</span></div>
            <h2 id="checkout-title">Fund a memory.<br />Do not inherit it.</h2>
            <p>Choose who pays. The passenger remains the beneficiary and sole policy owner.</p>
            <div className="mode-toggle">
              <button className={sponsorMode === "sponsor" ? "selected" : ""} onClick={() => setSponsorMode("sponsor")}><strong>Sponsor Maya</strong><span>Evelyn funds Maya’s room</span></button>
              <button className={sponsorMode === "self" ? "selected" : ""} onClick={() => setSponsorMode("self")}><strong>Maya pays</strong><span>Maya funds her own room</span></button>
            </div>
            <div className="checkout-summary"><div><span>PAYER</span><strong>{sponsor.name}</strong></div><div><span>BENEFICIARY</span><strong>{mission.passenger.name}</strong></div><div><span>VIEWING RIGHTS</span><strong>Maya decides</strong></div></div>
            <div className="checkout-policy"><span>✓</span><p><strong>Consent is the product.</strong> The sponsor receives proof of payment. Maya controls every viewing right.</p></div>
            <button className="primary-button full-button" onClick={beginCheckout} disabled={isCheckingOut}>{isCheckingOut ? "Opening secure checkout…" : `Continue to Stripe · ${amount(mission.entitlement.amountCents)}`}<span>↗</span></button>
            <small className="checkout-disclosure">A verified Stripe webhook activates the entitlement. No payment method is stored by LaunchDay.</small>
          </div>
        </div>
      )}
    </main>
  );
}
