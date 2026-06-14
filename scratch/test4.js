import fs from "node:fs";
import vm from "node:vm";
import * as cheerio from "cheerio";

async function test() {
  const playerJsUrl = "https://argon.razorshell.space/assets/players/jwplayer/player.js?cb=3849805144";
  
  // 1. Read razorshell.html and extract _juicycodes string
  console.log("Reading scratch/razorshell.html...");
  const html = fs.readFileSync("scratch/razorshell.html", "utf8");
  const $ = cheerio.load(html);
  
  let encryptedStr = "";
  $("script").each((i, el) => {
    const text = $(el).text();
    if (text.includes("_juicycodes")) {
      const match = text.match(/_juicycodes\((["'])(.*?)\1\)/);
      if (match) {
        encryptedStr = match[2];
      } else {
        // Handle multiline concatenation
        const argMatch = text.match(/_juicycodes\(([\s\S]*?)\)/);
        if (argMatch) {
          // Eval the argument block safely
          try {
            encryptedStr = eval(argMatch[1]);
          } catch (e) {
            console.log("Failed to eval juicycodes arg:", e.message);
          }
        }
      }
    }
  });
  
  if (!encryptedStr) {
    console.log("Could not find juicycodes encrypted string in HTML.");
    return;
  }
  
  console.log("Extracted encrypted string length:", encryptedStr.length);
  
  // 2. Fetch player.js
  console.log("Fetching player.js...");
  const res = await fetch(playerJsUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
      "Referer": "https://codedew.com/"
    }
  });
  const js = await res.text();
  console.log("player.js fetched.");
  
  // 3. Define custom sandbox context
  let capturedEvalCode = "";
  const sandbox = {
    window: {},
    document: {
      addEventListener: () => {},
      removeEventListener: () => {}
    },
    navigator: {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
    },
    setTimeout: setTimeout,
    setInterval: setInterval,
    clearTimeout: clearTimeout,
    clearInterval: clearInterval,
    console: console,
    eval: (code) => {
      capturedEvalCode = code;
    }
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.top = sandbox;
  
  const context = vm.createContext(sandbox);
  vm.runInContext(js, context);
  
  console.log("Running _juicycodes decryption in VM...");
  vm.runInContext(`window._juicycodes("${encryptedStr}")`, context);
  
  console.log("\nDecrypted Code Captured:");
  console.log(capturedEvalCode);
}

test().catch(err => console.error("Error:", err));
