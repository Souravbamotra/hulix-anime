import { ANIME } from "@consumet/extensions";

async function test() {
  console.log("Instantiating Hianime provider...");
  const hianime = new ANIME.Hianime();
  
  try {
    console.log("Searching for 'One Piece'...");
    const searchResults = await hianime.search("One Piece");
    console.log(`Found ${searchResults.results.length} results.`);
    if (searchResults.results.length > 0) {
      const firstResult = searchResults.results[0];
      console.log("First result:", firstResult);
      
      console.log(`\nFetching episodes for slug/id: ${firstResult.id}...`);
      const animeInfo = await hianime.fetchAnimeInfo(firstResult.id);
      console.log(`Found ${animeInfo.episodes.length} episodes.`);
      if (animeInfo.episodes.length > 0) {
        const firstEp = animeInfo.episodes[0];
        console.log("First episode:", firstEp);
        
        console.log(`\nFetching streaming sources for episode: ${firstEp.id}...`);
        const sources = await hianime.fetchEpisodeSources(firstEp.id);
        console.log("Sources:", JSON.stringify(sources, null, 2));
      }
    }
  } catch (err) {
    console.error("Error with Hianime provider:", err);
  }
}
test();
