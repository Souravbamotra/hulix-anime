import * as cheerio from "cheerio";

async function test() {
  const url = "https://blazer.raretoonsindia.com/5vW2SJOn";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    
    console.log("Forms on page:");
    $("form").each((i, el) => {
      console.log(`Form ${i + 1}: action="${$(el).attr("action")}" method="${$(el).attr("method")}"`);
      $(el).find("input").each((j, input) => {
        console.log(`  Input ${j + 1}: name="${$(input).attr("name")}" value="${$(input).attr("value")}" type="${$(input).attr("type")}"`);
      });
    });
    
    console.log("\nLinks on page:");
    $("a").each((i, el) => {
      console.log(`Link ${i + 1}: text="${$(el).text().trim()}" href="${$(el).attr("href")}" id="${$(el).attr("id") || ""}" class="${$(el).attr("class") || ""}"`);
    });
    
    console.log("\nScript tags containing redirections or encryption:");
    $("script").each((i, el) => {
      const text = $(el).text();
      if (text.includes("location") || text.includes("post") || text.includes("token") || text.includes("url")) {
        console.log(`Script ${i + 1} length: ${text.length}`);
        console.log(text.substring(0, 500));
        console.log("--------------------------------");
      }
    });
  } catch (err) {
    console.error(err);
  }
}
test();
