import fs from "fs";

async function test() {
  const url = "https://argon.razorshell.space/assets/players/jwplayer/player.js?cb=3849805144";
  try {
    const res = await fetch(url, {
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
        "Referer": "https://codedew.com/"
      }
    });
    const js = await res.text();
    
    // Find juicycodes_0x2cf29e definition
    const idx = js.indexOf("juicycodes_0x2cf29e={");
    if (idx !== -1) {
      console.log("FOUND juicycodes_0x2cf29e:");
      console.log(js.substring(idx, idx + 4000));
    } else {
      console.log("Not found.");
    }
  } catch (err) {
    console.error(err);
  }
}
test();
