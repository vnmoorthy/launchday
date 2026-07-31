import { NextRequest, NextResponse } from "next/server";
import { get as getBlob } from "@vercel/blob";
import { DEFAULT_STORY } from "@/lib/demo-data";
import { requireMissionOwner } from "@/lib/authorization";
import { saveStory } from "@/lib/mission-store";
import type { FirstOrbitStory } from "@/lib/types";

const storySchema = {
  name: "launchday_first_orbit_story",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["title", "subtitle", "narration", "beats"],
    properties: {
      title: { type: "string" },
      subtitle: { type: "string" },
      narration: { type: "string" },
      beats: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["time", "copy"],
          properties: {
            time: { type: "string" },
            copy: { type: "string" },
          },
        },
      },
    },
  },
};

function demoStory(imageCount: number): FirstOrbitStory {
  return {
    ...DEFAULT_STORY,
    subtitle:
      imageCount > 0
        ? `A private record shaped from ${imageCount} passenger memory${imageCount === 1 ? "" : "ies"}.`
        : DEFAULT_STORY.subtitle,
  };
}

async function asVisionImage(url: string) {
  if (url.startsWith("blob:")) {
    return null;
  }

  if (!url.includes(".private.blob.vercel-storage.com")) {
    return { type: "image_url" as const, image_url: { url } };
  }

  const stored = await getBlob(url, { access: "private" });
  if (!stored || stored.statusCode !== 200) {
    throw new Error("Private image is unavailable");
  }

  const bytes = await new Response(stored.stream).arrayBuffer();
  return {
    type: "image_url" as const,
    image_url: {
      url: `data:${stored.blob.contentType};base64,${Buffer.from(bytes).toString("base64")}`,
    },
  };
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { missionId?: string };
  if (!body.missionId) {
    return NextResponse.json({ error: "Mission is required" }, { status: 400 });
  }

  const authorization = await requireMissionOwner(body.missionId);
  if ("error" in authorization) return authorization.error;
  const { mission } = authorization;
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    const story = demoStory(mission.images.length);
    await saveStory(mission.id, story);
    return NextResponse.json({ story, demo: true });
  }

  let imageContent;
  try {
    imageContent = (await Promise.all(mission.images.map((image) => asVisionImage(image.url)))).filter(
      (image): image is Exclude<typeof image, null> => image !== null,
    );
  } catch {
    return NextResponse.json({ error: "A private mission image could not be prepared" }, { status: 502 });
  }
  const prompt = [
    "You write a short, cinematic but emotionally grounded private First Orbit story for a civilian spaceflight passenger.",
    "Never claim this is medical, flight-safety, or operational training. Do not invent mission facts beyond the supplied context.",
    `Passenger: ${mission.passenger.name}. Destination: ${mission.destination}.`,
    "Return exactly the requested JSON. Keep narration under 105 words. The story is for the passenger and their explicitly invited family.",
  ].join(" ");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.APP_BASE_URL ?? "http://localhost:3000",
      "X-Title": "LaunchDay",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL ?? "google/gemini-3.1-flash-lite",
      provider: { require_parameters: true },
      response_format: { type: "json_schema", json_schema: storySchema },
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: prompt }, ...imageContent],
        },
      ],
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Story generation is temporarily unavailable" }, { status: 502 });
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const rawStory = payload.choices?.[0]?.message?.content;
  if (!rawStory) {
    return NextResponse.json({ error: "No structured story returned" }, { status: 502 });
  }

  try {
    const story = JSON.parse(rawStory) as FirstOrbitStory;
    await saveStory(mission.id, story);
    return NextResponse.json({ story });
  } catch {
    return NextResponse.json({ error: "Story response did not match the contract" }, { status: 502 });
  }
}
