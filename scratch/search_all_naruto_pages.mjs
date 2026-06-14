import * as cheerio from "cheerio";

async function searchRareAnimesPaginated(keyword, page = 1) {
  try {
    const url = `https://www.rareanimes.mov/page/${page}/?s=${encodeURIComponent(keyword)}`;
    console.log(`Searching page ${page}: ${url}`);
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
    });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const results = [];
    $("article").each((i, element) => {
      const titleLink = $(element).find("h2.entry-title a, .entry-title a").first();
      const href = titleLink.attr("href");
      const title = titleLink.text().trim();
      if (href) {
        const slug = href.replace("https://www.rareanimes.mov/", "").replace(/\/$/, "");
        results.push({ title, slug });
      }
    });
    return results;
  } catch (err) {
    console.error("Error searching page:", page, err.message);
    return [];
  }
}

async function run() {
  for (let page = 1; page <= 5; page++) {
    const results = await searchRareAnimesPaginated("Naruto", page);
    console.log(`Page ${page} found ${results.length} results:`);
    results.forEach(r => console.log(` - "${r.title}" -> "${r.slug}"`));
  }
}

run();
