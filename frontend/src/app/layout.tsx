import type { Metadata } from "next";
import { Providers } from "./providers";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "PYrte Radio - AI-Powered Community Radio",
  description:
    "Request songs, vote on tracks, and listen to AI-generated music on PYrte Radio - the community-driven radio station powered by Suno AI.",
  keywords: ["radio", "AI music", "Suno", "community radio", "music generation"],
  authors: [{ name: "PYrte Radio Shack" }],
  openGraph: {
    title: "PYrte Radio - AI-Powered Community Radio",
    description: "Request songs, vote on tracks, and listen to AI-generated music",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "PYrte Radio - AI-Powered Community Radio",
    description: "Request songs, vote on tracks, and listen to AI-generated music",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
