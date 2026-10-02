import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://contour-wheat.vercel.app"),
  title: {
    default: "Contour — AI PR Risk & Architecture Copilot",
    template: "%s — Contour",
  },
  description: "Risk-scored architecture maps for every pull request.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark bg-black">
      <body className="bg-black text-[#EDEDED] selection:bg-[#22C55E]/30 antialiased">{children}</body>
    </html>
  );
}
