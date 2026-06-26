/**
 * Title Grouping Whitelist
 * Series for which episodes from multiple search posts should be combined into a single sequence.
 */
export const COMBINE_SEASONS_WHITELIST = [
  "one piece",
  "black clover",
  "detective conan",
  "pokemon",
  "fairy tail",
  "doraemon",
  "dragon ball"
];

/**
 * RareAnimes Episode Number Offsets
 * Used for multi-season compilation offset starts.
 */
export const RAREANIMES_SEASON_OFFSETS = {
  "one piece": {
    1: 1,
    20: 892,
    22: 1089
  },
  "dragon ball": {
    1: 1,
    3: 58,
    4: 75
  }
};

/**
 * Doraemon Movies AniList -> RareAnimes compilation map
 * Maps keywords in title to the movie index on RareAnimes compilation page.
 */
export const DORAEMON_MOVIE_MAP = {
  "little space war": 1,
  "little star wars": 41,
  "south sea": 2,
  "steel troops": 3,
  "dinosaur": 4,
  "shin kyouryuu": 40,
  "dorabian nights": 5,
  "three magical swordsmen": 6,
  "mugen sankenshi": 6,
  "animal planet": 7,
  "jadooi tapu": 7,
  "khel khilona bhool bhulaiya": 8,
  "tin labyrinth": 8,
  "jannat no.1": 9,
  "yeh bhi tha nobita woh bhi tha nobita": 10,
  "legend of the sun king": 10,
  "jadoo mantar": 11,
  "magic": 11,
  "bow! bow!": 12,
  "haunts of evil": 12,
  "koya koya planet": 13,
  "spaceblazer": 13,
  "galaxy super express": 14,
  "galactic express": 14,
  "toofani adventure": 15,
  "wind wizard": 15,
  "fushigi kaze tsukai": 15,
  "gadget museum": 16,
  "stand by me": 17,
  "stand by me 2": 32,
  "stand by me doraemon 2": 32,
  "bana superhero": 18,
  "ichi mera dost": 19,
  "nayi duniya": 20,
  "hara hara planet": 21,
  "green giant": 21,
  "jalpari": 22,
  "mermaid naval battle": 22,
  "jungle mein dangal": 23,
  "universe yatra": 24,
  "space heroes": 24,
  "antariksh daku": 25,
  "robot kingdom": 26,
  "birdopia": 27,
  "gol gol golmaal": 28,
  "dinosaur yoddhha": 29,
  "birth of japan": 30,
  "underwater adventure": 31,
  "antarctica": 33,
  "treasure island": 34,
  "takarajima": 34,
  "chala chand pe": 35,
  "moon exploration": 35,
  "sky utopia": 36,
  "earth symphony": 37,
  "new dinosaur": 40
};

/**
 * Parse Season/Part number from AniList title string.
 */
export function getAniListSeasonNum(title) {
  if (!title) return null;
  const lower = title.toLowerCase();
  const seasonMatch = lower.match(/\bseason\s*0*(\d+)\b/i) || 
                      lower.match(/\b0*(\d+)(?:st|nd|rd|th)\s*season\b/i) ||
                      lower.match(/\bpart\s*0*(\d+)\b/i);
  if (seasonMatch) {
    return parseInt(seasonMatch[1], 10);
  }
  
  if (lower.includes(" season ii") || lower.includes(" 2nd season")) return 2;
  if (lower.includes(" season iii") || lower.includes(" 3rd season")) return 3;
  if (lower.includes(" season iv") || lower.includes(" 4th season")) return 4;
  if (lower.includes(" season v") || lower.includes(" 5th season")) return 5;
  
  return null;
}

/**
 * Returns a hardcoded Gogoanime slug override if available.
 */
export function getGogoAnimeOverride(titleRomaji, titleEnglish, isDub) {
  const cleanTitleRomaji = (titleRomaji || "").toLowerCase().trim();
  const cleanTitleEnglish = (titleEnglish || "").toLowerCase().trim();
  
  if (cleanTitleRomaji === "one piece" || cleanTitleEnglish === "one piece") {
    return isDub ? "anime/one-piece-dub" : "anime/one-piece";
  }

  // Wistoria: Wand and Sword overrides
  const isWistoria = 
    cleanTitleRomaji.includes("wistoria") || 
    cleanTitleEnglish.includes("wistoria") ||
    cleanTitleRomaji.includes("tsue to tsurugi no") || 
    cleanTitleEnglish.includes("wand and sword");

  if (isWistoria) {
    const seasonNum = getAniListSeasonNum(titleRomaji) || getAniListSeasonNum(titleEnglish) || 1;
    if (seasonNum === 2) {
      return isDub ? "no_slug" : "anime/wistoria-wand-and-sword-season-2";
    }
    return isDub ? "anime/wistoria-wand-and-sword-dub" : "anime/wistoria-wand-and-sword";
  }
  
  const isDemonSlayerS1 = 
    cleanTitleRomaji === "kimetsu no yaiba" || 
    cleanTitleEnglish === "demon slayer: kimetsu no yaiba";
    
  if (isDemonSlayerS1) {
    return isDub ? "anime/demon-slayer-kimetsu-no-yaiba-dub" : "anime/demon-slayer-kimetsu-no-yaiba";
  }
  
  return null;
}

/**
 * Returns a hardcoded RareAnimes slug override to check BEFORE checking caching layers.
 */
export function getRareAnimesOverrideBeforeCache(titleRomaji, titleEnglish) {
  const cleanTitleRomaji = (titleRomaji || "").toLowerCase().trim();
  const cleanTitleEnglish = (titleEnglish || "").toLowerCase().trim();

  // Wistoria: Wand and Sword overrides
  const isWistoria = cleanTitleRomaji.includes("wistoria") || cleanTitleEnglish.includes("wistoria") ||
                     cleanTitleRomaji.includes("tsue to tsurugi no wistoria") || cleanTitleEnglish.includes("wand and sword");
  if (isWistoria) {
    const seasonNum = getAniListSeasonNum(titleRomaji) || getAniListSeasonNum(titleEnglish) || 1;
    if (seasonNum === 2) {
      return "hindi/wistoria-wand-and-sword-season-2-hindi-dubbed-episodes-download-hd";
    }
    return "hindi/wistoria-wand-and-sword-season-1-hindi-dubbed-episodes-download-hd";
  }

  // Dragon Ball overrides
  if (cleanTitleRomaji === "dragon ball" || cleanTitleEnglish === "dragon ball") {
    return "multi::1||hindi/dragon-ball-1986-hindi-dubbed-episodes-censored-download-hd::3||hindi/dragon-ball-1986-season-03-hindi-dubbed-episodes-download-hd::4||hindi/dragon-ball-1986-season-04-hindi-dubbed-episodes-download-hd";
  }

  // Re:Zero overrides
  const isReZero = cleanTitleRomaji.includes("re:zero") || cleanTitleEnglish.includes("re:zero") ||
                   cleanTitleRomaji.includes("re-zero") || cleanTitleEnglish.includes("re-zero") ||
                   cleanTitleRomaji.startsWith("rezero") || cleanTitleEnglish.startsWith("rezero");

  if (isReZero) {
    if (cleanTitleRomaji.includes("frozen bond") || cleanTitleEnglish.includes("frozen bond") ||
        cleanTitleRomaji.includes("hyouketsu") || cleanTitleEnglish.includes("hyouketsu")) {
      return "hindi/rezero-starting-life-in-another-world-the-frozen-bond-2019-movie-hindi-dubbed-download-hd";
    }
    if (cleanTitleRomaji.includes("memory snow") || cleanTitleEnglish.includes("memory snow")) {
      return "hindi/rezero-starting-life-in-another-world-memory-snow-2018-movie-hindi-dubbed-download-hd";
    }
    
    const seasonNum = getAniListSeasonNum(titleRomaji) || getAniListSeasonNum(titleEnglish) || 1;
    if (seasonNum === 1) {
      return "hindi/rezero-starting-life-in-another-world-season-1-hindi-dubbed-episodes-download-hd";
    }
    if (seasonNum === 2) {
      return "hindi/rezero-starting-life-in-another-world-season-2-hindi-dubbed-episodes-download-hd";
    }
    if (seasonNum === 3) {
      return "hindi/rezero-starting-life-in-another-world-season-3-hindi-dubbed-episodes-download-hd";
    }
    if (seasonNum === 4) {
      return "hindi/rezero-starting-life-in-another-world-season-4-hindi-dubbed-episodes-download-hd";
    }
  }

  return null;
}

/**
 * Returns a hardcoded RareAnimes slug override to check AFTER cache miss.
 */
export function getRareAnimesOverrideAfterCache(titleRomaji, titleEnglish) {
  const cleanTitleRomaji = (titleRomaji || "").toLowerCase().trim();
  const cleanTitleEnglish = (titleEnglish || "").toLowerCase().trim();

  if (cleanTitleRomaji === "naruto" || cleanTitleEnglish === "naruto") {
    return "hindi/naruto-all-season-hindi-tamil-telugu-bengali-malayalam-episodes-download-hd";
  }
  if (cleanTitleRomaji === "naruto shippuden" || cleanTitleEnglish === "naruto shippuden" || 
      cleanTitleRomaji === "naruto: shippuuden" || cleanTitleEnglish === "naruto: shippuuden") {
    return "hindi/naruto-shippuden-all-season-hindi-tamil-telugu-bengali-malayalam-episodes-download-hd";
  }
  if (cleanTitleRomaji === "doraemon" || cleanTitleEnglish === "doraemon") {
    return "hindi/doraemon-all-season-hindi-episodes-download-hd";
  }

  return null;
}

/**
 * Resolves English title fallback for Doraemon movies when English title is null on AniList.
 */
export function getDoraemonEnglishTitle(titleRomaji) {
  if (!titleRomaji) return null;
  const lower = titleRomaji.toLowerCase();
  if (lower.includes("midori no kyojin") || lower.includes("green giant") || lower.includes("hara hara planet")) {
    return "Doraemon: Nobita and the Green Giant Legend";
  }
  return null;
}
