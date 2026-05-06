import { NextRequest, NextResponse } from "next/server";
import { freeAstroFetch } from "../freeastro";

const API_BASE = process.env.FREEASTRO_API_BASE ?? "https://api.freeastroapi.com";

type MatchBirth = {
  label?: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second?: number;
  city?: string;
  lat: number;
  lng: number;
  tz_str?: string;
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.FREEASTRO_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Set FREEASTRO_API_KEY in .env.local before matching Kundlis." },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => null);
  const p1 = body?.p1 as MatchBirth | undefined;
  const p2 = body?.p2 as MatchBirth | undefined;
  const ayanamsha = String(body?.ayanamsha ?? "lahiri");

  const validationError = validateMatchBirth("p1", p1) || validateMatchBirth("p2", p2);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }
  if (!p1 || !p2) {
    return NextResponse.json({ error: "Both p1 and p2 birth details are required." }, { status: 400 });
  }

  try {
    const response = await freeAstroFetch(new URL("/api/v1/vedic/match", API_BASE), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        p1: normalizeBirth(p1),
        p2: normalizeBirth(p2),
        ayanamsha,
      }),
      cache: "no-store",
    }, 18_000);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error ?? data.message ?? `Match endpoint failed with status ${response.status}.` },
        { status: response.status },
      );
    }

    return NextResponse.json({
      input: {
        p1: { label: p1.label?.trim() || "Person 1", city: p1.city ?? "" },
        p2: { label: p2.label?.trim() || "Person 2", city: p2.city ?? "" },
        ayanamsha,
      },
      match: data,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "FreeAstro match endpoint failed." },
      { status: 502 },
    );
  }
}

function normalizeBirth(birth: MatchBirth) {
  return {
    year: birth.year,
    month: birth.month,
    day: birth.day,
    hour: birth.hour,
    minute: birth.minute,
    lat: birth.lat,
    lng: birth.lng,
    city: birth.city,
    tz_str: birth.tz_str || "AUTO",
  };
}

function validateMatchBirth(label: string, birth?: MatchBirth) {
  if (!birth) return `Missing ${label} birth details.`;
  const numericFields: (keyof MatchBirth)[] = ["year", "month", "day", "hour", "minute", "lat", "lng"];
  for (const field of numericFields) {
    if (typeof birth[field] !== "number" || Number.isNaN(birth[field])) {
      return `Invalid ${label}.${field}.`;
    }
  }
  return "";
}
