# LaunchDay Demo Runbook

## Preflight

- Start the app with `npm run dev`.
- Keep the home page at `http://localhost:3000` open.
- If live providers are not connected, leave demo mode enabled; the entire story still works.
- If Stripe is connected, run `stripe listen --forward-to localhost:3000/api/stripe/webhook` in a second terminal.

## 90-second live demo

**0–10 seconds — thesis**

“When a spaceflight passenger pays—or is sponsored—the payer should not automatically own the passenger’s story.”

**10–30 seconds — payment**

Open **Unlock Family Mission Room**, select **Sponsor Maya**, and point to the three roles: Payer, Beneficiary, Audience. Say: “This is Consent Checkout: payment creates an entitlement for Maya, not a viewing key for Evelyn.”

**30–45 seconds — Stripe effect**

Complete Stripe Checkout, or use the demo fallback. When the room unlocks, say: “The paid webhook minted a Mission Entitlement bound to Maya’s Auth0 identity.”

**45–65 seconds — Auth0 effect**

Invite a guest. Then revoke the guest. Say: “The money remains valid. Maya’s ownership remains valid. Only the audience policy changes.”

**65–80 seconds — emotional payoff**

Click **Regenerate narrative** and then **Listen to Maya’s story**. Say: “The valuable product is not the ticket. It is the private story a family can share with the passenger’s permission.”

**80–90 seconds — close**

“Stripe moves value. Auth0 governs trust. LaunchDay makes a once-in-a-lifetime experience safe to share.”

## Fallback order

1. Use the shipped demo payment fallback if Stripe Checkout is unavailable.
2. Use the local structured story fallback if OpenRouter is unavailable.
3. Use browser speech if ElevenLabs is unavailable.
4. Keep the app UI open; every fallback is labelled and demonstrates the same consent model.
