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

  const cacheHeaders = {
    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600"
  };

  try {
    // 1. Get all servers for an episode (new endpoint)
    if (episodeId && servers === "true") {
      if (episodeId.startsWith("anidap-")) {
        const parts = episodeId.split("-");
        const malId = parts[1];
        const epNum = parts[2];
        const type = parts[3] || "sub";
        
        const server = {
          category: type,
          name: "AniDap",
          type: "embed",
          iframeUrl: `https://anidap.se/watch?id=${malId}&ep=${epNum}&type=${type}`,
          sourceType: "hls"
        };
        
        return NextResponse.json({
          servers: [server],
          defaultServer: server
        }, { headers: cacheHeaders });
      }

      const serverData = await getEpisodeServers(episodeId);
      if (!serverData || serverData.servers.length === 0) {
        return NextResponse.json({ error: "No streaming servers found" }, { status: 404 });
      }
      return NextResponse.json(serverData, { headers: cacheHeaders });
    }

    // 2. Get direct stream / iframe URL for an episode (legacy)
    if (episodeId) {
      if (episodeId.startsWith("anidap-")) {
        const parts = episodeId.split("-");
        const malId = parts[1];
        const epNum = parts[2];
        const type = parts[3] || "sub";
        
        const { extractAnidapStream } = await import("@/lib/scraper");
        const mockEmbedUrl = `https://anidap.se/watch?id=${malId}&ep=${epNum}&type=${type}`;
        const streamData = await extractAnidapStream(mockEmbedUrl);
        if (!streamData) {
          return NextResponse.json({ error: "Streaming source not found on AniDap" }, { status: 404 });
        }
        return NextResponse.json({
          iframeUrl: streamData.directUrl,
          sourceType: "hls"
        }, { headers: cacheHeaders });
      }

      const streamData = await getEpisodeStreamUrl(episodeId);
      if (!streamData) {
        return NextResponse.json({ error: "Streaming source not found" }, { status: 404 });
      }
      return NextResponse.json(streamData, { headers: cacheHeaders });
    }

    // 3. Get episodes list for a known slug
    if (slug) {
      if (slug.startsWith("toonstream-")) {
        const { getToonStreamEpisodes } = await import("@/lib/scraper");
        const realSlug = slug.replace("toonstream-", "").replace(/__/g, "/");
        const episodes = await getToonStreamEpisodes(realSlug);
        return NextResponse.json({ episodes }, { headers: cacheHeaders });
      }
      if (slug.startsWith("rareanimes-")) {
        const { getRareAnimesEpisodes } = await import("@/lib/scraper");
        const realSlug = slug.replace("rareanimes-", "").replace(/__/g, "/");
        const episodes = await getRareAnimesEpisodes(realSlug);
        return NextResponse.json({ episodes }, { headers: cacheHeaders });
      }
      if (slug.startsWith("anidap-")) {
        const malId = slug.split("-")[1];
        const { getAnidapEpisodes } = await import("@/lib/scraper");
        const episodes = await getAnidapEpisodes(malId, slug.includes("-dub"));
        return NextResponse.json({ episodes }, { headers: cacheHeaders });
      }
      const episodes = await getAnimeEpisodes(slug);
      return NextResponse.json({ episodes }, { headers: cacheHeaders });
    }

    // 4. Match AniList titles to Gogoanime/RareAnimes and return slug + episodes
    if (titleRomaji || titleEnglish) {
      const provider = searchParams.get("provider");
      const seasonYearVal = searchParams.get("seasonYear") ? parseInt(searchParams.get("seasonYear"), 10) : null;
      
      if (provider === "rareanimes") {
        const { findRareAnimesSlug, getRareAnimesEpisodes } = await import("@/lib/scraper");
        const foundSlug = await findRareAnimesSlug(titleRomaji, titleEnglish, format, seasonYearVal);
        if (!foundSlug) {
          return NextResponse.json({ error: "Anime not found on provider" }, { status: 404 });
        }
        const episodes = await getRareAnimesEpisodes(foundSlug);
        const safeSlug = foundSlug.replace(/\//g, "__");
        return NextResponse.json({ slug: `rareanimes-${safeSlug}`, episodes }, { headers: cacheHeaders });
      }

      const foundSlug = await findGogoAnimeSlug(titleRomaji, titleEnglish, format, false, seasonYearVal);
      if (!foundSlug) {
        return NextResponse.json({ error: "Anime not found on provider" }, { status: 404 });
      }
      const episodes = await getAnimeEpisodes(foundSlug);
      return NextResponse.json({ slug: foundSlug, episodes }, { headers: cacheHeaders });
    }

    return NextResponse.json({ error: "Bad request. Provide either 'episodeId', 'slug', or 'titleRomaji'/'titleEnglish'" }, { status: 400 });
  } catch (error) {
    console.error("Watch API Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
