import { findRareAnimesSlug, getRareAnimesEpisodes, getEpisodeServers, extractRareAnimesStream } from "../src/lib/scraper.js";

async function test() {
  const slug = await findRareAnimesSlug("Solo Leveling", "Solo Leveling");
  const episodes = await getRareAnimesEpisodes(slug);
  const serversData = await getEpisodeServers(episodes[0].slug);
  
  const server = serversData.servers[0];
  const extracted = await extractRareAnimesStream(server.iframeUrl);
  
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
    "Referer": "https://argon.razorshell.space/"
  };

  if (extracted && extracted.directUrl) {
    const res1 = await fetch(extracted.directUrl, { headers });
    const text1 = await res1.text();
    const subUrl = text1.split("\n").find(line => line.startsWith("http"));
    
    if (subUrl) {
      const res2 = await fetch(subUrl, { headers });
      const text2 = await res2.text();
      const tsUrl = text2.split("\n").find(line => line.includes(".ts") || (line.startsWith("http") && !line.includes(".m3u8")));
      
      console.log("TS Segment URL:", tsUrl);
      if (tsUrl) {
        // Test with localhost referer
        console.log("Fetching TS segment with localhost Referer...");
        const resLocalhost = await fetch(tsUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0",
            "Referer": "http://localhost:3000/"
          }
        });
        console.log("Status with localhost Referer:", resLocalhost.status);

        // Test with NO Referer (empty string)
        console.log("Fetching TS segment with empty Referer...");
        const resEmpty = await fetch(tsUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0",
            "Referer": ""
          }
        });
        console.log("Status with empty Referer:", resEmpty.status);
      }
    }
  }
}

test().catch(err => console.error("Global Error:", err));
