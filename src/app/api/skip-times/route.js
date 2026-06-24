import { NextResponse } from "next/server";
import { getCache, setCache, getCacheKey } from "@/lib/cache";

const CACHE_TTL_30_DAYS = 30 * 24 * 60 * 60 * 1000;

// GraphQL helper to query Anime-Skip API
async function queryAnimeSkip(query, variables) {
  const url = 'https://api.anime-skip.com/graphql';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-ID': 'ZGfO0sMF3eCwLYf8yMSCJjlynwNGRXWE'
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(6000)
  });
  if (!res.ok) {
    throw new Error(`Anime-Skip responded with status ${res.status}`);
  }
  const data = await res.json();
  if (data.errors && data.errors.length > 0) {
    throw new Error(data.errors[0].message);
  }
  return data.data;
}

// REST fallback helper to query AniSkip API
async function queryAniSkipREST(malId, episodeNumber, episodeLength) {
  if (!malId) return null;
  const length = episodeLength ? Math.round(episodeLength) : 1440;
  const url = `https://api.aniskip.com/v2/skip-times/${malId}/${episodeNumber}?types[]=op&types[]=ed&episodeLength=${length}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(5000)
    });
    
    if (!res.ok) {
      if (length !== 1440) {
        const fallbackUrl = `https://api.aniskip.com/v2/skip-times/${malId}/${episodeNumber}?types[]=op&types[]=ed&episodeLength=1440`;
        const fallbackRes = await fetch(fallbackUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          signal: AbortSignal.timeout(5000)
        });
        if (fallbackRes.ok) {
          return await fallbackRes.json();
        }
      }
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`[Skip API Fallback] AniSkip REST query failed for MAL ID ${malId}:`, err.message);
    return null;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const animeId = searchParams.get("animeId");
  const malId = searchParams.get("malId");
  const episodeNumber = searchParams.get("episodeNumber");
  const episodeLength = parseFloat(searchParams.get("episodeLength") || "1440");

  if (!animeId && !malId) {
    return NextResponse.json({ error: "Missing animeId or malId" }, { status: 400 });
  }
  if (!episodeNumber) {
    return NextResponse.json({ error: "Missing episodeNumber" }, { status: 400 });
  }

  // 1. Check L1/L2 local cache first
  const cacheKey = getCacheKey("skip_times", `${animeId || "null"}_${malId || "null"}_${episodeNumber}`);
  const cached = await getCache(cacheKey, CACHE_TTL_30_DAYS);
  if (cached) {
    console.log(`[Skip API] Cache hit for animeId:${animeId} malId:${malId} ep:${episodeNumber}`);
    return NextResponse.json(cached);
  }

  let finalSkipTimes = { found: false };

  // 2. Try Anime-Skip GraphQL API (Primary, using AniList ID)
  if (animeId) {
    try {
      console.log(`[Skip API] Primary lookup: querying Anime-Skip for AniList ID ${animeId}`);
      // Find show by AniList ID
      const showData = await queryAnimeSkip(
        `query FindShowsByExternalId($serviceId: String!) {
          findShowsByExternalId(service: ANILIST, serviceId: $serviceId) {
            id
            name
          }
        }`,
        { serviceId: String(animeId) }
      );

      const shows = showData?.findShowsByExternalId || [];
      
      // Loop through matching shows to locate the episode
      for (const show of shows) {
        if (!show.id) continue;
        
        const epData = await queryAnimeSkip(
          `query FindEpisodesByShowId($showId: ID!) {
            findEpisodesByShowId(showId: $showId) {
              id
              number
              baseDuration
            }
          }`,
          { showId: show.id }
        );

        const episodes = epData?.findEpisodesByShowId || [];
        
        // Find matching episode number
        const targetNumStr = String(episodeNumber).trim();
        const targetNumFloat = parseFloat(episodeNumber);
        
        const matchedEpisode = episodes.find(ep => {
          if (!ep.number) return false;
          const epNumStr = String(ep.number).trim();
          const epNumFloat = parseFloat(ep.number);
          return epNumStr === targetNumStr || (!isNaN(targetNumFloat) && !isNaN(epNumFloat) && epNumFloat === targetNumFloat);
        });

        if (matchedEpisode?.id) {
          const tsData = await queryAnimeSkip(
            `query FindTimestampsByEpisodeId($episodeId: ID!) {
              findTimestampsByEpisodeId(episodeId: $episodeId) {
                id
                at
                type {
                  name
                }
              }
            }`,
            { episodeId: matchedEpisode.id }
          );

          const timestamps = tsData?.findTimestampsByEpisodeId || [];
          if (timestamps.length > 0) {
            // Sort timestamps by at ascending
            timestamps.sort((a, b) => a.at - b.at);
            
            let intro = null;
            let outro = null;

            for (let i = 0; i < timestamps.length; i++) {
              const ts = timestamps[i];
              const typeName = ts.type?.name || "";
              const isIntroType = typeName === "Intro" || typeName === "New Intro" || typeName === "Mixed Intro";
              const isOutroType = typeName === "Credits" || typeName === "New Credits" || typeName === "Mixed Credits";
              
              if (isIntroType && !intro) {
                const start = ts.at;
                const end = (i + 1 < timestamps.length) ? timestamps[i + 1].at : episodeLength;
                intro = { start, end };
              }
              
              if (isOutroType && !outro) {
                const start = ts.at;
                const end = (i + 1 < timestamps.length) ? timestamps[i + 1].at : episodeLength;
                outro = { start, end };
              }
            }

            if (intro || outro) {
              finalSkipTimes = {
                found: true,
                episodeLength: matchedEpisode.baseDuration || null,
                ...(intro ? { intro } : {}),
                ...(outro ? { outro } : {})
              };
              console.log(`[Skip API] Successfully resolved timestamps on Anime-Skip for ep: ${episodeNumber}`);
              break; // Found matching skip times, stop loop
            }
          }
        }
      }
    } catch (err) {
      console.error(`[Skip API Primary Error] Anime-Skip GraphQL failed:`, err.message);
    }
  }

  // 3. Fallback to AniSkip REST API (if Anime-Skip lookup yielded no results)
  if (!finalSkipTimes.found && malId) {
    console.log(`[Skip API] Secondary lookup: querying AniSkip REST for MAL ID ${malId}`);
    const restData = await queryAniSkipREST(malId, episodeNumber, episodeLength);
    if (restData && restData.found && restData.results) {
      const times = {};
      let dbLength = null;
      restData.results.forEach((r) => {
        if (r.episodeLength) dbLength = r.episodeLength;
        if (r.skipType === "op") times.intro = { start: r.interval.startTime, end: r.interval.endTime };
        if (r.skipType === "ed") times.outro = { start: r.interval.startTime, end: r.interval.endTime };
      });
      
      if (times.intro || times.outro) {
        finalSkipTimes = {
          found: true,
          episodeLength: dbLength,
          ...times
        };
        console.log(`[Skip API] Successfully resolved timestamps on AniSkip REST fallback for ep: ${episodeNumber}`);
      }
    }
  }

  // 4. Cache final result (including not found entries, to protect rate-limits)
  await setCache(cacheKey, finalSkipTimes, CACHE_TTL_30_DAYS);

  return NextResponse.json(finalSkipTimes, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800" // CDN Cache for 1 day
    }
  });
}
