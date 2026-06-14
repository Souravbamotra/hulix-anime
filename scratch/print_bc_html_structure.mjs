import * as cheerio from "cheerio";

async function checkPage(slug) {
  const url = `https://www.rareanimes.mov/${slug}/`;
  console.log(`\n=== Structure of: ${url} ===`);
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  // Let's print out the first 30 children elements' tags and texts
  console.log("Children of .entry-content:");
  $(".entry-content").children().slice(0, 40).each((i, el) => {
    const tagName = el.name;
    const text = $(el).text().trim();
    const htmlSnippet = $.html(el).substring(0, 150);
    console.log(`${i}: <${tagName}> Text: "${text.substring(0, 80)}"`);
    console.log(`   HTML Snippet: ${htmlSnippet}`);
  });
}

async function run() {
  await checkPage("hindi/black-clover-episodes-hindi-subbed-download-fhd");
  await checkPage("hindi/black-clover-season-01-episodes-hindi-dubbed-download-hd");
}

run().catch(console.error);
