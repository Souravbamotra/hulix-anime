import fs from "node:fs";
import * as cheerio from "cheerio";

function decryptJuicyCodes(encryptedStr) {
  const symbolMap = ["`","%","-","+","*","$","!","_","^","="];
  const saltStr = encryptedStr.slice(-3);
  const dataStr = encryptedStr.slice(0, -3);
  
  // 1. Decode salt
  let o = "";
  for (let i = 0; i < saltStr.length; i++) {
    o += (saltStr.charCodeAt(i) - 100).toString();
  }
  const salt = parseInt(o, 10);
  
  // 2. Base64 decode
  const decodedB64 = Buffer.from(dataStr.replace(/_/g, "+").replace(/-/g, "/"), "base64").toString("utf8");
  
  // 3. Map symbols to digits (including -1 for non-matching chars!)
  let digits = "";
  for (let i = 0; i < decodedB64.length; i++) {
    digits += symbolMap.indexOf(decodedB64[i]).toString();
  }
  
  // 4. Decode chunks of 4 digits
  const chunks = digits.match(/.{4}/g) || [];
  let decrypted = "";
  for (let chunk of chunks) {
    const charCode = parseInt(chunk, 10) - salt;
    decrypted += String.fromCharCode(charCode);
  }
  return decrypted;
}

// Test on the saved HTML
const html = fs.readFileSync("scratch/razorshell.html", "utf8");
const $ = cheerio.load(html);
let encryptedStr = "";
$("script").each((i, el) => {
  const text = $(el).text();
  if (text.includes("_juicycodes")) {
    const match = text.match(/_juicycodes\(([\s\S]*?)\)/);
    if (match) {
      encryptedStr = eval(match[1]);
    }
  }
});

if (encryptedStr) {
  console.log("Decrypted via custom function:");
  console.log(decryptJuicyCodes(encryptedStr).substring(0, 1000));
} else {
  console.log("Not found.");
}
