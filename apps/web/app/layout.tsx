import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

// Runs before first paint, so a saved light theme never flashes dark.
const APPLY_SAVED_THEME = `try{if(localStorage.getItem("contour-theme")==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

const description =
  "Contour draws every pull request as an architecture and data-flow diagram and posts it as a comment in GitHub, so reviewers see what a change touches before they read the diff.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://contour-wheat.vercel.app"),
  title: {
    default: "Contour — architecture diagrams for every pull request",
    template: "%s — Contour",
  },
  description,
  keywords: ["pull request", "code review", "GitHub App", "architecture diagram", "data flow"],
  openGraph: { title: "Contour", description, type: "website", url: "/" },
  twitter: { card: "summary_large_image", title: "Contour", description },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPLY_SAVED_THEME }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
