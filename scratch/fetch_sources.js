import * as cheerio from "cheerio";

const URL = "https://codedew.com/zipper/?url=dIWQdtAqm%2FOJaDqDhsx4UcWPbe2cbs8zOkhT1htqCt74Kv2grJP6FQZB3ozER1M5%2B0DuEBPmbGRhYKVeq%2FM4j7%2FR%2BdWikeym9XncNOkW0d9MrQ%3D%3D";

async function test() {
  try {
    console.log(`[Test] Step 1: Fetching player HTML page...`);
    const res = await fetch(URL, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    const cookies = res.headers.get("set-cookie") || "";
    console.log(`[Test] Redirected: ${res.redirected}`);
    console.log(`[Test] Final URL: ${res.url}`);
    console.log(`[Test] Cookies received: ${cookies}`);
    const html = await res.text();
    
    // Parse _x_92 or similar variable using regex
    const varMatch = html.match(/const _x_\d+\s*=\s*['"]([^'"]+)['"]/);
    if (!varMatch) {
      console.log("[Test] Encrypted _x_ variable not found!");
      return;
    }
    
    const encryptedStr = varMatch[1];
    console.log(`[Test] Found encrypted string: ${encryptedStr}`);
    
    // Reverse it
    const reversed = encryptedStr.split('').reverse().join('');
    console.log(`[Test] Reversed: ${reversed}`);
    
    // Base64 decode
    const fileId = Buffer.from(reversed, 'base64').toString('utf-8');
    console.log(`[Test] Decoded fileId: ${fileId}`);
    
    // Step 2: POST request to retrieve sources
    console.log(`[Test] Step 2: Making POST request to get sources...`);
    
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-Requested-With": "XMLHttpRequest"
    };
    
    if (cookies) {
      const parsedCookies = cookies.split(",").map(c => c.split(";")[0].trim()).join("; ");
      headers["Cookie"] = parsedCookies;
    }
    
    const postRes = await fetch(res.url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ fileId: fileId })
    });
    
    console.log(`[Test] POST Status: ${postRes.status}`);
    const resText = await postRes.text();
    try {
      const json = JSON.parse(resText);
      console.log(`[Test] JSON output:`, JSON.stringify(json, null, 2));
    } catch (e) {
      console.log(`[Test] Response is not valid JSON! Error: ${e.message}`);
      console.log(`[Test] HTML Output snippet:\n${resText.substring(0, 1500)}`);
    }
    
  } catch (error) {
    console.error(error);
  }
}
test();
