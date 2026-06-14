const GOGOANIME_URL = "https://gogoanimes.cv";

async function testFetch(slug) {
  try {
    const url = `${GOGOANIME_URL}/${slug}/`;
    console.log(`[Test] Fetching: ${url}`);
    
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    
    console.log(`[Test] Status: ${res.status}`);
    const html = await res.text();
    console.log(`[Test] HTML length: ${html.length}`);
    console.log(`[Test] Snippet:\n${html.substring(0, 500)}`);
  } catch (error) {
    console.error("[Test] Error:", error);
  }
}

testFetch("anime/naruto-2002");
