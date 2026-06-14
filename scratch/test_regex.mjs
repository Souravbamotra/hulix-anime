function testRegex(text) {
  const regex = /(?:\b(?:episode|ep|e)\s*0*|\bS\d+E\s*0*)(\d+(\.\d+)?)\b/i;
  const match = text.match(regex);
  if (match) {
    console.log(`"${text}" -> Matched! Episode: ${match[1]}`);
  } else {
    console.log(`"${text}" -> No match`);
  }
}

console.log("=== Testing Regex ===");
testRegex("Naruto S01E01");
testRegex("Naruto S01E26");
testRegex("Episode 1");
testRegex("Ep 2");
testRegex("E03");
testRegex("Dragon Ball Super E101");
testRegex("Zip Download"); // should not match
