import { NextResponse } from "next/server";
import { findGogoAnimeSlug, getAnimeEpisodes, getEpisodeStreamUrl, getEpisodeServers } from "@/lib/scraper";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const episodeId = searchParams.get("episodeId");
  const slug = searchParams.get("slug");
  const titleRomaji = searchParams.get("titleRomaji");
  const titleEnglish = searchParams.get("titleEnglish");
  const format = searchParams.get("format") || "";
  const servers = searchParams.get("servers"); // new: if "true", return all servers

  try {
    // 1. Get all servers for an episode (new endpoint)
    if (episodeId && servers === "true") {
      const serverData = await getEpisodeServers(episodeId);
      if (!serverData || serverData.servers.length === 0) {
        return NextResponse.json({ error: "No streaming servers found" }, { status: 404 });
      }
      return NextResponse.json(serverData);
    }

    // 2. Get direct stream / iframe URL for an episode (legacy)
    if (episodeId) {
      const streamData = await getEpisodeStreamUrl(episodeId);
      if (!streamData) {
        return NextResponse.json({ error: "Streaming source not found" }, { status: 404 });
      }
      return NextResponse.json(streamData);
    }

    // 3. Get episodes list for a known slug
    if (slug) {
      if (slug.startsWith("rareanimes-")) {
        const { getRareAnimesEpisodes } = await import("@/lib/scraper");
        const realSlug = slug.replace("rareanimes-", "").replace(/__/g, "/");
        const episodes = await getRareAnimesEpisodes(realSlug);
        return NextResponse.json({ episodes });
      }
      const episodes = await getAnimeEpisodes(slug);
      return NextResponse.json({ episodes });
    }

    // 4. Match AniList titles to Gogoanime/RareAnimes and return slug + episodes
    if (titleRomaji || titleEnglish) {
      const provider = searchParams.get("provider");
      if (provider === "rareanimes") {
        const { findRareAnimesSlug, getRareAnimesEpisodes } = await import("@/lib/scraper");
        const foundSlug = await findRareAnimesSlug(titleRomaji, titleEnglish, format);
        if (!foundSlug) {
          return NextResponse.json({ error: "Anime not found on provider" }, { status: 404 });
        }
        const episodes = await getRareAnimesEpisodes(foundSlug);
        const safeSlug = foundSlug.replace(/\//g, "__");
        return NextResponse.json({ slug: `rareanimes-${safeSlug}`, episodes });
      }

      const foundSlug = await findGogoAnimeSlug(titleRomaji, titleEnglish, format);
      if (!foundSlug) {
        return NextResponse.json({ error: "Anime not found on provider" }, { status: 404 });
      }
      const episodes = await getAnimeEpisodes(foundSlug);
      return NextResponse.json({ slug: foundSlug, episodes });
    }

    return NextResponse.json({ error: "Bad request. Provide either 'episodeId', 'slug', or 'titleRomaji'/'titleEnglish'" }, { status: 400 });
  } catch (error) {
    console.error("Watch API Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
