import type { Metadata } from "next";
import "./globals.css";
import Shell from "@/components/Shell";

export const metadata: Metadata = {
  title: "TalkSuite — NetSuite AI by Opus Inspection",
  description: "Opus Inspection's plain-English NetSuite assistant — instant answers for Finance, Sales, and Inventory.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
