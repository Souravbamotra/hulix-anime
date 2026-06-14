import fs from "fs";

async function test() {
  const url = "https://animelok.net/watch/one-piece-21";
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    const text = await res.text();
    fs.writeFileSync("watch_one_piece.html", text);
    console.log("Saved HTML to watch_one_piece.html. Length:", text.length);
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
