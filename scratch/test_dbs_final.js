import { getRareAnimesEpisodes } from "../src/lib/scraper.js";

async function run() {
  const slug = "hindi/dragon-ball-super-all-hindi-episodes-download-hd-complete-series";
  console.log(`Calling getRareAnimesEpisodes for: "${slug}"`);
  
  const episodes = await getRareAnimesEpisodes(slug);
  console.log(`\nParsed ${episodes.length} episodes in total!`);
  
  if (episodes.length > 0) {
    console.log("\nFirst 3 episodes:");
    console.log(JSON.stringify(episodes.slice(0, 3), null, 2));
    
    console.log("\nLast 3 episodes:");
    console.log(JSON.stringify(episodes.slice(-3), null, 2));
  } else {
    console.log("No episodes found!");
  }
}

run().catch(err => console.error(err));
