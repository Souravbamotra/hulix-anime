
import * as cheerio from "cheerio";

const html = `
            <ul class="items">
                                        <li>
                            <div class="img">
                                <a href="https://gogoanimes.cv/anime/boruto-naruto-the-movie-the-day-naruto-became-the-hokage/" title="Boruto: Naruto the Movie &#8211; The Day Naruto Became the Hokage">
                                    <img post-id="10742" fifu-featured="1" src="https://cdn.noitatnemucod.net/thumbnail/300x400/100/b19c06fae70eab67b1f390ed3cd905d8.jpg" alt="Boruto: Naruto the Movie &#8211; The Day Naruto Became the Hokage" title="Boruto: Naruto the Movie &#8211; The Day Naruto Became the Hokage">                                </a>
                            </div>
                            <p class="name">
                                <a href="https://gogoanimes.cv/anime/boruto-naruto-the-movie-the-day-naruto-became-the-hokage/" title="Boruto: Naruto the Movie &#8211; The Day Naruto Became the Hokage">
                                    Boruto: Naruto the Movie &#8211; The Day Naruto Became the Hokage                                </a>
                            </p>
                            <p class="released">
                                Released:                             </p>
                        </li></ul>`;

const $ = cheerio.load(html);
const results = [];
$("article, .listupd .bs, ul.items li").each((i, element) => {
  const aTag = $(element).find("a").first();
  const href = aTag.attr("href");
  
  if (href && (href.includes("/series/") || href.includes("/anime/"))) {
    const title = $(element).find(".tt").text().trim() || $(element).find(".name").text().trim() || aTag.attr("title") || aTag.text().trim();
    const image = $(element).find("img").attr("src") || $(element).find("img").attr("data-src");
    
    // Slug includes series/ or anime/ prefix
    const slug = href.replace(`https://gogoanimes.cv/`, "").replace(/\/$/, "");
    
    results.push({ title, slug, image, released: "" });
  }
});

console.log(results);

