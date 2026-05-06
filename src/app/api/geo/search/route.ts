import { NextRequest, NextResponse } from "next/server";
import { freeAstroFetch } from "../../freeastro";

const API_BASE = process.env.FREEASTRO_API_BASE ?? "https://api.freeastroapi.com";

export async function GET(request: NextRequest) {
  const apiKey = process.env.FREEASTRO_API_KEY;
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = searchParams.get("limit") ?? "8";
  const country = searchParams.get("country")?.trim();

  if (q.length < 2) {
    return NextResponse.json({ results: [], count: 0 });
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: "Set FREEASTRO_API_KEY in .env.local to enable city search." },
      { status: 500 },
    );
  }

  const upstreamUrl = new URL("/api/v2/geo/search", API_BASE);
  upstreamUrl.searchParams.set("q", q);
  upstreamUrl.searchParams.set("limit", limit);
  if (country) upstreamUrl.searchParams.set("country", country);

  try {
    const response = await freeAstroFetch(upstreamUrl, {
      headers: { "x-api-key": apiKey },
      cache: "no-store",
    }, 10_000);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: payload.error ?? payload.message ?? "FreeAstro city search failed." },
        { status: response.status },
      );
    }

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "FreeAstro city search failed." },
      { status: 502 },
    );
  }
}
