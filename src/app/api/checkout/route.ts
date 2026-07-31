import { NextRequest, NextResponse } from "next/server";
import { requireMissionOwner } from "@/lib/authorization";
import { activateEntitlement } from "@/lib/mission-store";
import { getAppBaseUrl, getStripe } from "@/lib/stripe";
import type { CheckoutRequest } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as CheckoutRequest;
  if (!body.missionId) {
    return NextResponse.json({ error: "Mission is required" }, { status: 400 });
  }

  const authorization = await requireMissionOwner(body.missionId);
  if ("error" in authorization) return authorization.error;

  const { mission } = authorization;
  const sponsorName = body.sponsorName?.trim() || mission.passenger.name;
  const sponsorEmail = body.sponsorEmail?.trim();
  const stripe = getStripe();

  if (!stripe) {
    const updatedMission = await activateEntitlement({
      missionId: mission.id,
      payerName: sponsorName,
      payerEmail: sponsorEmail,
      checkoutSessionId: "demo_checkout_session",
    });
    return NextResponse.json({ demo: true, mission: updatedMission });
  }

  const baseUrl = getAppBaseUrl(request);
  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    submit_type: "pay",
    customer_email: sponsorEmail || undefined,
    client_reference_id: mission.passenger.id,
    success_url: `${baseUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/?checkout=cancelled`,
    metadata: {
      product: "launchday_family_mission_room",
      missionId: mission.id,
      beneficiaryAuth0Sub: mission.passenger.id,
      policyVersion: "consent-checkout-v1",
      sponsorName,
    },
    payment_intent_data: {
      metadata: {
        missionId: mission.id,
        beneficiaryAuth0Sub: mission.passenger.id,
        policyVersion: "consent-checkout-v1",
      },
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: mission.entitlement.amountCents,
          product_data: {
            name: "LaunchDay Family Mission Room",
            description: "Private, revocable access for the people the passenger chooses.",
          },
        },
      },
    ],
  });

  if (!checkout.url) {
    return NextResponse.json({ error: "Stripe did not return a checkout URL" }, { status: 502 });
  }

  return NextResponse.json({ checkoutUrl: checkout.url });
}
