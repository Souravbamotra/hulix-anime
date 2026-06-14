const watchBetaUrl = "https://codedew.com/watchbeta/?url=XKD2F4uS";

async function test() {
  console.log("Fetching final watchbeta URL:", watchBetaUrl);
  const res = await fetch(watchBetaUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
      "Referer": "https://codedew.com/zipper/?url=00xlgrdrbywepOVgYcVI5vLFpG%2Bbn06kkU1d9P4cz0xXw0oFpFDz93Wp6ZTAEt1d1Zkmg8D7BLHhjWgzoQ%3D%3D&ad_step=2"
    }
  });
  
  const html = await res.text();
  console.log("Final URL:", res.url);
  console.log("HTML (first 1000 chars):", html.slice(0, 1000));
}

test().catch(err => console.error("Global Error:", err));
