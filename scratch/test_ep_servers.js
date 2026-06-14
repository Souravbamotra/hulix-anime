import * as cheerio from "cheerio";

async function run() {
  const url = "https://9anime.org.lv/solo-leveling-season-2-arise-from-the-shadow-episode-1/";
  console.log("Fetching:", url);
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  // 1. Parse the select.mirror options
  console.log("=== Select.mirror options ===");
  $("select.mirror option").each((i, el) => {
    const val = $(el).attr("value") || "";
    const text = $(el).text().trim();
    const idx = $(el).attr("data-index");
    if (val) {
      // Decode base64 value
      let decoded = "";
      try {
        decoded = Buffer.from(val, "base64").toString("utf-8");
      } catch(e) {
        decoded = "(decode failed)";
      }
      console.log(`Option ${idx}: "${text}" -> ${decoded}`);
    }
  });
  
  // 2. Parse server buttons
  console.log("\n=== Server buttons ===");
  $(".server-button, [class*='server-btn'], button[data-embed], a[data-embed]").each((i, el) => {
    console.log(`Button: class="${$(el).attr('class')}" text="${$(el).text().trim()}" data-embed="${$(el).attr('data-embed')}" data-value="${$(el).attr('data-value')}" data-index="${$(el).attr('data-index')}"`);
  });
  
  // 3. Look for kiwik containers
  console.log("\n=== Kiwik containers ===");
  const kiwikSub = $("#kiwikSubContainer").html();
  const kiwikDub = $("#kiwikDubContainer").html();
  console.log("kiwikSubContainer:", kiwikSub ? kiwikSub.substring(0, 500) : "(empty or not found)");
  console.log("kiwikDubContainer:", kiwikDub ? kiwikDub.substring(0, 500) : "(empty or not found)");
  
  // 4. Look for buttonContainer
  console.log("\n=== buttonContainer ===");
  const btnContainer = $("#buttonContainer").html();
  console.log("buttonContainer:", btnContainer ? btnContainer.substring(0, 1000) : "(empty or not found)");
  
  // 5. Find server tabs/sections  
  console.log("\n=== Server type sections ===");
  $(".servers, .serversList, .server-list, #servers-list, #w-servers").each((i, el) => {
    console.log(`Found: tag=${el.tagName} id="${$(el).attr('id')}" class="${$(el).attr('class')}"`);
    console.log($(el).html()?.substring(0, 500));
  });
  
  // 6. Print kiwikSubRow and kiwikDubRow
  console.log("\n=== kiwikSubRow / kiwikDubRow ===");
  console.log("kiwikSubRow:", $("#kiwikSubRow").html()?.substring(0, 500) || "(not found)");
  console.log("kiwikDubRow:", $("#kiwikDubRow").html()?.substring(0, 500) || "(not found)");
  
  // 7. Extract the AJAX parameters for kiwik
  console.log("\n=== AJAX kiwik params ===");
  const ajaxMatch = html.match(/var malId = '(\d+)';\s*var ep = '(\d+)';\s*var security = '([^']+)'/);
  if (ajaxMatch) {
    console.log(`malId: ${ajaxMatch[1]}, ep: ${ajaxMatch[2]}, security: ${ajaxMatch[3]}`);
  }
  
  // 8. Find all option values and decode them
  console.log("\n=== Full decoded mirror list ===");
  $("select.mirror option[value]").each((i, el) => {
    const val = $(el).attr("value");
    if (val) {
      try {
        const decoded = Buffer.from(val, "base64").toString("utf-8");
        const text = $(el).text().trim();
        // Extract src from decoded iframe
        const srcMatch = decoded.match(/src="([^"]+)"/);
        console.log(`${text}: ${srcMatch ? srcMatch[1] : decoded}`);
      } catch(e) {}
    }
  });
}

run().catch(console.error);
