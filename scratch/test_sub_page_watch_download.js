async function test() {
  const url = "https://codedew.com/zipper/?url=NaAepHd3U4gyyw7uFK%2FrGcEQN6C8y6Cjqq4zoicEES2%2F3hWSBjmdi4Ij1DfkL0gqICghuIvKp3iQ0pNRWoMjRsDLcUlewz144yUH%2BFH1dNxJr5tw2YqPA3DkDE7V6eWzwSl1hmUr%2BiSxevPeOIHxD8%2FW";
  console.log("Fetching sub-page Watch/Download zipper...");
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36" }
  });
  console.log("Redirected URL:", res.url);
  const html = await res.text();
  console.log("HTML length:", html.length);
  console.log(html.slice(0, 2000));
}

test();
