async function test() {
  const url = "https://9anime.org.lv/anime/naruto-dub/";
  console.log("Fetching episode page...");
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
  });
  const html = await res.text();
  
  const movieIdMatch = html.match(/id="movie_id"\s*value="([^"]+)"/) || html.match(/name="movie_id"\s*value="([^"]+)"/);
  const nonceMatch = html.match(/nonce:\s*['"]([^'"]+)['"]/);
  
  console.log("movie_id:", movieIdMatch ? movieIdMatch[1] : "not found");
  console.log("nonce:", nonceMatch ? nonceMatch[1] : "not found");
  
  // Also check if there are static episode items
  const cheerio = await import("cheerio");
  const $ = cheerio.load(html);
  const staticCount = $(".episode-item").length;
  console.log("Static episode-item count:", staticCount);
}

test();
