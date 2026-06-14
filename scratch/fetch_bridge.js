async function test() {
  const url = "https://codedew.com/zipper/?url=vp1FLOCybTpKWFpoyvlKDccFOXBCGQawFy8Qdx5Ff%2BTgz6nGa1vXE7IJ4tXweTgswfh3zWgyBaAS8DxYppIppjsQKpqBnQ%3D%3D";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    console.log(`Status: ${res.status}`);
    const html = await res.text();
    console.log(`HTML Length: ${html.length}`);
    console.log("Snippet:\n", html.substring(0, 1500));
    
    // Look for redirections, script tags, meta redirects or decoders
    console.log("\nSearching for script elements:");
    const scriptRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
      const scriptText = match[0];
      if (scriptText.includes("window.location") || scriptText.includes("atob") || scriptText.includes("base64") || scriptText.includes("decode")) {
        console.log("Found relevant script:\n", scriptText);
      }
    }
  } catch (err) {
    console.error(err);
  }
}
test();
