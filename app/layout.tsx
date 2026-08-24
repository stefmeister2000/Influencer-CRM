import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ORVION — Influencer CRM",
  description: "Compliant influencer discovery, outreach & CRM for ORVION",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
