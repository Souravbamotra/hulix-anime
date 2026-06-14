async function run() {
  const url = "https://9anime.org.lv/solo-leveling-season-2-arise-from-the-shadow-episode-1/";
  console.log("Fetching:", url);
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
  });
  console.log("Status:", res.status);
  console.log("Final URL:", res.url);
  const html = await res.text();
  
  // Search for common patterns related to video players
  const patterns = [
    "data-video", "iframe", "player", "embed", "server", 
    "data-type", "data-src", "data-url", "player-type",
    "w-servers", "video-player", "sources", "m3u8",
    "encrypted-url", "eplister", "class=\"player"
  ];
  
  console.log("\n=== Pattern search in HTML ===");
  for (const pattern of patterns) {
    const count = (html.match(new RegExp(pattern, "gi")) || []).length;
    if (count > 0) {
      console.log(`"${pattern}" found ${count} times`);
    }
  }
  
  // Print relevant chunks
  console.log("\n=== Looking for player/server section ===");
  
  // Find the video player area
  const playerMatch = html.match(/<div[^>]*class="[^"]*player[^"]*"[^>]*>[\s\S]{0,2000}/i);
  if (playerMatch) {
    console.log("Player div found:", playerMatch[0].substring(0, 500));
  }
  
  // Find iframe
  const iframeMatches = [...html.matchAll(/<iframe[^>]*>/gi)];
  console.log(`\nFound ${iframeMatches.length} iframes:`);
  for (const m of iframeMatches) {
    console.log(m[0]);
  }
  
  // Find any data-video attributes
  const dataVideoMatches = [...html.matchAll(/data-video="([^"]*)"/gi)];
  console.log(`\nFound ${dataVideoMatches.length} data-video attributes:`);
  for (const m of dataVideoMatches) {
    console.log(m[0].substring(0, 200));
  }
  
  // Look for w-servers or server lists
  const serverSection = html.match(/id="w-servers[\s\S]{0,2000}/i);
  if (serverSection) {
    console.log("\nServer section found:", serverSection[0].substring(0, 500));
  }
  
  // Look for any select or option elements (server selector)
  const selectMatches = [...html.matchAll(/<select[^>]*>[\s\S]*?<\/select>/gi)];
  console.log(`\nFound ${selectMatches.length} select elements`);
  for (const m of selectMatches) {
    console.log(m[0].substring(0, 500));
  }
  
  // Print a section around "Server" text
  const serverIdx = html.indexOf("Server");
  if (serverIdx !== -1) {
    console.log("\nContext around 'Server':", html.substring(Math.max(0, serverIdx - 200), serverIdx + 500));
  }
  
  // Print area around any script tags with player config
  const scriptMatches = [...html.matchAll(/<script[^>]*>[\s\S]*?<\/script>/gi)];
  console.log(`\nFound ${scriptMatches.length} script tags. Checking for player-related ones...`);
  for (const m of scriptMatches) {
    const content = m[0];
    if (content.includes("player") || content.includes("server") || content.includes("iframe") || content.includes("embed") || content.includes("video")) {
      console.log("\n--- Player-related script ---");
      console.log(content.substring(0, 800));
    }
  }
}

run().catch(console.error);
