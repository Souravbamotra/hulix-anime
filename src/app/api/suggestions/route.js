import { NextResponse } from "next/server";
import { getSearchSuggestions } from "@/lib/anilist";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.trim().length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const cacheHeaders = {
    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
  };

  try {
    const suggestions = await getSearchSuggestions(query.trim());
    return NextResponse.json({ suggestions }, { headers: cacheHeaders });
  } catch (error) {
    console.error("Suggestions API Route Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
