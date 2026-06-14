async function test() {
  const url = "https://9anime.org.lv/";
  console.log("Fetching 9anime home page...");
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    console.log("Status:", res.status);
    console.log("Final URL:", res.url);
    const html = await res.text();
    console.log("HTML length:", html.length);
    console.log("First 1500 chars of HTML:");
    console.log(html.slice(0, 1500));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

test();
