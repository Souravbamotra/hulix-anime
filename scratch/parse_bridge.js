import * as cheerio from "cheerio";

async function test() {
  const url = "https://blazer.raretoonsindia.com/5vW2SJOn";
  try {
    console.log(`[Test] Fetching blazer URL: ${url}`);
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" },
      redirect: "manual" // Stop to see if there's a 302/301 redirect
    });
    
    console.log(`[Test] Status: ${res.status}`);
    console.log(`[Test] Location header: ${res.headers.get("location")}`);
    
    if (res.status === 302 || res.status === 301) {
      const targetUrl = res.headers.get("location");
      console.log(`[Test] Redirecting to: ${targetUrl}`);
    } else {
      const html = await res.text();
      console.log(`[Test] Content length: ${html.length}`);
      console.log(`[Test] Content snippet:\n${html.substring(0, 1500)}`);
    }
  } catch (err) {
    console.error(err);
  }
}
test();
