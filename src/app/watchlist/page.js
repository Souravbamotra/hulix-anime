import Watchlist from "@/components/Watchlist";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "My List — Hulix Anime",
  description: "Your personal anime watchlist on Hulix Anime.",
};

export default function WatchlistPage() {
  return (
    <>
      <Navbar />
      <main style={{ minHeight: "80vh", paddingTop: "40px", paddingBottom: "40px" }}>
        <Watchlist />
      </main>
    </>
  );
}
