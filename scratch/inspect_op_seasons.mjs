import { getRareAnimesEpisodes } from "../src/lib/scraper.js";

async function inspect() {
  const seasons = [
    { name: "Season 1 (Hindi)", slug: "hindi/one-piece-season-01-episodes-hindi-dubbed-download-hd" },
    { name: "Season 20 (Hindi)", slug: "hindi/one-piece-season-20-episodes-hindi-dubbed-download-hd" },
    { name: "Season 22 (Hindi)", slug: "hindi/one-piece-season-22-episodes-hindi-dubbed-download-hd" }
  ];

  for (const s of seasons) {
    console.log(`\n=== Inspecting ${s.name} ===`);
    try {
      const eps = await getRareAnimesEpisodes(s.slug);
      console.log(`Found ${eps.length} episodes`);
      if (eps.length > 0) {
        console.log("First episode:", eps[0]);
        console.log("Middle episode:", eps[Math.floor(eps.length / 2)]);
        console.log("Last episode:", eps[eps.length - 1]);
      }
    } catch (e) {
      console.error(`Error inspecting ${s.name}:`, e.message);
    }
  }
}

inspect().catch(console.error);
