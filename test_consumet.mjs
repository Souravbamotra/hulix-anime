import * as consumet from "@consumet/extensions";

console.log("Consumet keys:", Object.keys(consumet));
if (consumet.ANIME) {
  console.log("Anime providers:", Object.keys(consumet.ANIME));
}
