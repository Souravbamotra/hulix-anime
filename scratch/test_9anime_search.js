import * as cheerio from "cheerio";

async function testSearch(keyword) {
  const url = `https://9anime.org.lv/?s=${encodeURIComponent(keyword)}`;
  console.log(`Searching: ${url}`);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    console.log("Status:", res.status);
    const html = await res.text();
    const $ = cheerio.load(html);
    
    const results = [];
    
    // Test the selectors we use in searchGogoAnime
    $("article, .listupd .bs, ul.items li").each((i, element) => {
      const aTag = $(element).find("a").first();
      const href = aTag.attr("href");
      
      const title = $(element).find(".tt").text().trim() || $(element).find(".name").text().trim() || aTag.attr("title") || aTag.text().trim();
      const image = $(element).find("img").attr("src") || $(element).find("img").attr("data-src");
      
      results.push({ title, href, image });
    });
    
    console.log(`Found ${results.length} search results:`);
    console.log(JSON.stringify(results.slice(0, 10), null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

testSearch("Naruto");
