function isSlugMatch(parentSlug, targetSlug) {
  const cleanParent = parentSlug.toLowerCase().replace(/[^a-z0-9]/g, " ");
  const cleanTarget = targetSlug.toLowerCase().replace(/[^a-z0-9]/g, " ");
  
  const ignoreWords = new Set(["hindi", "episodes", "download", "complete", "series", "all", "season", "arc", "saga", "dubbed", "watch", "hd", "fhd"]);
  const parentWords = cleanParent.split(/\s+/).filter(w => w.length > 2 && !ignoreWords.has(w));
  
  if (parentWords.length === 0) return true;
  
  const targetWords = new Set(cleanTarget.split(/\s+/));
  const matched = parentWords.filter(w => targetWords.has(w));
  
  const matchRatio = matched.length / parentWords.length;
  console.log(`Matching parent: "${parentSlug}" vs target: "${targetSlug}"`);
  console.log(`- parentWords:`, parentWords);
  console.log(`- targetWords:`, Array.from(targetWords));
  console.log(`- matched:`, matched);
  console.log(`- ratio:`, matchRatio);
  return matchRatio >= 0.8;
}

function cleanParentTitleForSearch(parentTitle) {
  if (!parentTitle) return "";
  let clean = parentTitle;
  // Replace hyphens with spaces first to handle slug strings
  clean = clean.replace(/-/g, " ");
  // Remove suffixes
  clean = clean.replace(/\b(all|hindi|dubbed|episodes|download|hd|complete|series|season|arc|saga|movie|films?|pack)\b.*/ig, "");
  // Remove special characters, multiple spaces
  clean = clean.replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
  return clean;
}

console.log("--- TEST 1: isSlugMatch ---");
console.log("Result (expect false):", isSlugMatch(
  "hindi/dragon-ball-super-all-hindi-episodes-download-hd-complete-series",
  "hindi/dragon-ball-1986-season-03-hindi-dubbed-episodes-download-hd"
));
console.log("\nResult (expect true):", isSlugMatch(
  "hindi/dragon-ball-super-all-hindi-episodes-download-hd-complete-series",
  "hindi/dragon-ball-super-season-2-golden-frieza-saga-hindi-episodes-download-01"
));

console.log("\n--- TEST 2: cleanParentTitleForSearch ---");
console.log("Result (expect 'dragon ball super'):", cleanParentTitleForSearch("dragon-ball-super-all-hindi-episodes-download-hd-complete-series"));
console.log("Result (expect 'jujutsu kaisen'):", cleanParentTitleForSearch("Jujutsu Kaisen Season 2 Hindi Dubbed Episodes Download HD"));
