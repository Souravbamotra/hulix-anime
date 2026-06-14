async function run() {
  const url = "https://9anime.org.lv/anime/one-piece/";
  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    console.log("HEAD request status:", res.status, "ok:", res.ok);
  } catch (err) {
    console.error("HEAD request failed:", err);
  }

  try {
    const resGet = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    console.log("GET request status:", resGet.status, "ok:", resGet.ok);
  } catch (err) {
    console.error("GET request failed:", err);
  }
}

run();
