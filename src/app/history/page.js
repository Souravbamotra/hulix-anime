import WatchHistory from "@/components/WatchHistory";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Watch History — Hulix Anime",
};

export default function HistoryPage() {
  return (
    <>
      <Navbar />
      <main style={{ minHeight: "80vh", paddingTop: "40px", paddingBottom: "40px" }}>
        <WatchHistory />
      </main>
    </>
  );
}
