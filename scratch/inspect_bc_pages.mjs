import { getRareAnimesEpisodes } from "../src/lib/scraper.js";

async function run() {
  const pages = [
    { name: "Episodes Hindi Subbed Download FHD", slug: "hindi/black-clover-episodes-hindi-subbed-download-fhd" },
    { name: "Season 1 Hindi Dubbed Download HD", slug: "hindi/black-clover-season-01-episodes-hindi-dubbed-download-hd" },
    { name: "Season 2 Hindi Dubbed Download HD", slug: "hindi/black-clover-season-02-episodes-hindi-dubbed-download-hd" }
  ];

  for (const p of pages) {
    console.log(`\n=== Inspecting ${p.name} ===`);
    try {
      const eps = await getRareAnimesEpisodes(p.slug);
      console.log(`Found ${eps.length} episodes.`);
      if (eps.length > 0) {
        console.log("First episode:", eps[0]);
        console.log("Last episode:", eps[eps.length - 1]);
      }
    } catch (e) {
      console.error(`Error fetching ${p.name}:`, e.message);
    }
  }
}

run().catch(console.error);
