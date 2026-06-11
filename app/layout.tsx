import type { Metadata } from "next";
import "./globals.css";
import LayoutClient from "@/components/LayoutClient";

export const metadata: Metadata = {
  title: "TalkSuite — NetSuite AI by Opus Inspection",
  description: "Opus Inspection's plain-English NetSuite assistant — instant answers for Finance, Sales, and Inventory.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  );
}
