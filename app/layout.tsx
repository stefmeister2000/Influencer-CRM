import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "O'Learys — Influencer CRM",
  description: "Creator discovery, outreach & CRM for O'Learys (Ghent, Hasselt, Netherlands).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
