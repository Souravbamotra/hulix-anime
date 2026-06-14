import "./globals.css";

export const metadata = {
  title: "Hulix Anime — Free High-Quality Anime Streaming",
  description: "Stream your favorite anime series and movies in premium quality for free. Ad-free streaming interface with instant searches and trending updates.",
  keywords: ["anime", "streaming", "watch anime", "free anime", "english sub", "dubbed anime", "hulix anime"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
