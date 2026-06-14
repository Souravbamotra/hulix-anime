async function run() {
  const url = "https://www.rareanimes.mov/naruto/";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    const html = await res.text();
    console.log("HTML Length:", html.length);
    
    // Let's print the first 2000 characters and some sections containing links
    console.log("=== Page Title & Head ===");
    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
    console.log("Title:", titleMatch ? titleMatch[1] : "Not found");
    
    console.log("\n=== Checking links in entry-content ===");
    // Find all links in entry-content
    const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    let count = 0;
    while ((match = linkRegex.exec(html)) !== null && count < 150) {
      const href = match[1];
      const text = match[2].replace(/<[^>]*>/g, "").trim();
      if (href.includes("rareanimes.mov") || href.includes("episode") || href.includes("season") || href.includes("arc") || href.includes("saga")) {
        console.log(`Link: text="${text}" href="${href}"`);
        count++;
      }
    }
  } catch (err) {
    console.error("Error fetching page:", err);
  }
}

run();
