# LaunchDay

**Consent Checkout for civilian spaceflight.** LaunchDay separates the person who pays, the passenger who benefits, and the audience allowed to participate in a private mission memory.

## What is built

- **Consent Checkout:** Stripe Checkout payment creates an entitlement for the passenger’s Auth0 identity, not the cardholder.
- **Private Family Mission Room:** the passenger invites named people; guests have time-bound access and the passenger can revoke it live.
- **First Orbit:** personal images become a short, structured private story, with ElevenLabs narration when configured.
- **Direct private uploads:** the browser uploads directly to a private Vercel Blob store; LaunchDay streams files back only after identity and access-policy checks.
- **Demo-safe:** the app has a fully interactive demo mode, so the pitch works before provider accounts are attached.

## Run the demo

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No credentials are required for the demo fallback.

The 90-second path:

1. Choose **Unlock Family Mission Room**.
2. Select **Sponsor Maya** to show that payer, beneficiary, and audience are different people.
3. Continue to Stripe. In demo mode, LaunchDay activates the entitlement locally.
4. Invite a guest, then revoke access. The payment remains valid and Maya retains ownership.
5. Regenerate **First Orbit** and play narration.

## Connect the live stack

Copy `.env.example` to `.env.local`, set `NEXT_PUBLIC_DEMO_MODE=false`, and never commit that file.

### 1. Provision the hackathon stack

From this directory, after authenticating with the Stripe CLI and installing the Projects plugin:

```bash
stripe projects init launchday
stripe projects add auth0/client
stripe projects add neon/postgres
stripe projects add vercel/project
stripe projects add openrouter/api
stripe projects add elevenlabs/tts
stripe projects env --pull
```

Create `AUTH0_SECRET` with `openssl rand -hex 32`. Stripe Projects provisions infrastructure; use a separate Stripe sandbox secret key for the checkout flow.

### 2. Configure Auth0

Set the following in the Auth0 application dashboard:

```text
Allowed Callback URL: http://localhost:3000/auth/callback
Allowed Logout URL: http://localhost:3000
Allowed Web Origin: http://localhost:3000
```

Add the deployed URL equivalents before shipping. LaunchDay uses Auth0 Next.js SDK v4, which mounts auth at `/auth/*` through `src/proxy.ts`.

### 3. Create the database

```bash
npm run db:push
```

The single `missions` record stores the private entitlement and audience-policy data. If Neon is absent or unmigrated, the app automatically keeps the demo in an in-memory store.

### 4. Add Vercel Blob

Create a **private** Blob store in Vercel and add:

```text
BLOB_READ_WRITE_TOKEN=...
NEXT_PUBLIC_VERCEL_BLOB_ENABLED=true
```

The upload token is minted only after a LaunchDay session exists. Private images are rendered through `/api/media` after re-checking the current user’s Mission Room permission. When a story model is enabled, private Blob media is read server-side and sent as an in-memory vision input; the browser never receives an unprotected Blob URL.

### 5. Connect Stripe Checkout and webhook

```text
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_BASE_URL=http://localhost:3000
```

For local testing:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the returned `whsec_...` secret into `.env.local`. The verified `checkout.session.completed` webhook is the only live path that activates a paid entitlement.

### 6. Add AI services

```text
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=google/gemini-3.1-flash-lite
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...
```

OpenRouter receives a strict JSON-schema request for the First Orbit story. ElevenLabs streams `eleven_flash_v2_5` audio to the browser. Without either credential, the UI uses a clearly labelled local fallback.

### 7. Deploy to Vercel

After the Vercel project exists and its credentials are in your environment:

```bash
npm run build
npx vercel deploy --prod --token="$VERCEL_TOKEN"
```

Set `APP_BASE_URL` to the deployed HTTPS URL, add that URL to Auth0’s callback, logout, and web-origin settings, then redeploy. Configure the Stripe webhook endpoint as:

```text
https://YOUR_DOMAIN/api/stripe/webhook
```

## Security boundary

- No payment card data touches LaunchDay.
- A Stripe webhook signature is verified before activating a paid feature.
- The payer never receives story access merely by paying.
- Mission owner actions require the passenger’s Auth0 identity; non-owner guests are read-only.
- Invites are identity-specific, can expire, and can be revoked.
- This product is a personal orientation and memory layer—not medical, safety, fitness, or flight-clearance software.

## Key files

- `src/app/api/checkout/route.ts` — creates Stripe Checkout with beneficiary and policy metadata.
- `src/app/api/stripe/webhook/route.ts` — verifies payment events and mints entitlements.
- `src/app/api/invites/route.ts` — creates named audience grants.
- `src/app/api/media/route.ts` — authorizes reads of private Blob media.
- `src/lib/mission-store.ts` — Neon-backed mission persistence with a demo fallback.
- `src/components/mission-control.tsx` — the full passenger demo surface.
