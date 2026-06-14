import * as cheerio from "cheerio";

async function test() {
  const url = "https://codedew.com/zipper/?url=H16IaM7X1s41HeSLY6VBiVzTM6RFiWEWFpAT%2FuQlbNKARQ2okMPUf4pK7%2F0jakSL3Ho4vGhgdACmLpb7o%2FM1dNBkox8AZQ%3D%3D";
  try {
    console.log(`[Test] Step 1: Fetching landing page to get tokens and cookies...`);
    const response = await fetch(url, {
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" 
      }
    });
    
    const cookies = response.headers.get("set-cookie") || "";
    console.log(`[Test] Set-Cookie: ${cookies}`);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Parse form inputs
    const form = $("form[action='/links/go']");
    if (form.length === 0) {
      console.log("[Test] Form not found!");
      console.log("[Test] HTML Output:\n", html.substring(0, 1500));
      return;
    }
    
    const bodyParams = new URLSearchParams();
    form.find("input").each((i, input) => {
      const name = $(input).attr("name");
      const val = $(input).attr("value") || "";
      if (name) {
        bodyParams.append(name, val);
      }
    });
    
    console.log(`[Test] Form inputs parsed:`, Object.fromEntries(bodyParams.entries()));
    
    // Wait 4 seconds to bypass countdown server check
    console.log(`[Test] Waiting 4 seconds for countdown to expire...`);
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    // Step 2: POST to /links/go
    console.log(`[Test] Step 2: Posting to /links/go...`);
    
    // Set headers
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "Referer": url,
      "Origin": "https://blazer.raretoonsindia.com"
    };
    
    // If cookies exist, pass them
    if (cookies) {
      // Split cookies and pass the session ones
      const parsedCookies = cookies.split(",").map(c => c.split(";")[0].trim()).join("; ");
      headers["Cookie"] = parsedCookies;
    }
    
    const postRes = await fetch("https://blazer.raretoonsindia.com/links/go", {
      method: "POST",
      headers: headers,
      body: bodyParams.toString()
    });
    
    console.log(`[Test] POST Status: ${postRes.status}`);
    const resText = await postRes.text();
    console.log(`[Test] Response Text:\n${resText}`);
    
    try {
      const json = JSON.parse(resText);
      console.log(`[Test] Success! Parsed JSON:`, json);
    } catch (e) {
      console.log(`[Test] Response is not valid JSON.`);
    }
    
  } catch (err) {
    console.error(err);
  }
}

test();
