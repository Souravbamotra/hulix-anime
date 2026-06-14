import * as cheerio from "cheerio";

async function test() {
  const url = "https://9anime.org.lv/anime/naruto-dub/";
  console.log("Fetching episode page...");
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  console.log("Page title:", $("title").text());
  
  // List all forms / inputs
  console.log("\nForm / Input elements:");
  $("input").each((i, el) => {
    console.log(`- type: ${$(el).attr("type")}, name: ${$(el).attr("name")}, id: ${$(el).attr("id")}, value: ${$(el).attr("value")}`);
  });
  
  // Let's print the text content of script tags that might contain AJAX variables
  console.log("\nScript tags containing variables:");
  $("script").each((i, el) => {
    const js = $(el).text();
    if (js.includes("var ") || js.includes("const ") || js.includes("ajax")) {
      console.log(`--- Script ${i} (length: ${js.length}) ---`);
      console.log(js.slice(0, 500));
    }
  });
  
  // Let's see if there are any list/episodes containers
  console.log("\nChecking for common episode container classes:");
  [".episodes", ".episode", "#episode", ".list-episode", ".eplist", "#episode_page", ".bar-list"].forEach(cls => {
    console.log(`- Class ${cls} exists:`, $(cls).length > 0);
  });
}

test();
