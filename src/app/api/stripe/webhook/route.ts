import { NextRequest, NextResponse } from "next/server";
import { activateEntitlement } from "@/lib/mission-store";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const missionId = session.metadata?.missionId;
    if (missionId) {
      await activateEntitlement({
        missionId,
        payerName: session.metadata?.sponsorName ?? session.customer_details?.name ?? undefined,
        payerEmail: session.customer_details?.email ?? undefined,
        checkoutSessionId: session.id,
      });
    }
  }

  return NextResponse.json({ received: true });
}
