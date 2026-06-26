"use client";

import { useRouter } from "next/navigation";

export default function BackToDetailsButton({ animeId, children }) {
  const router = useRouter();

  const handleBack = (e) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      const prevPath = window.prevPathname || "";
      const expectedPath = `/anime/${animeId}`;
      if (prevPath === expectedPath || prevPath.startsWith(expectedPath + "?")) {
        console.log("[Navigation] Navigating back to details page using history.back()");
        router.back();
        return;
      }
    }
    console.log("[Navigation] Pushing to details page:", `/anime/${animeId}`);
    router.push(`/anime/${animeId}`);
  };

  return (
    <a href={`/anime/${animeId}`} onClick={handleBack} className="back-link">
      {children}
    </a>
  );
}
