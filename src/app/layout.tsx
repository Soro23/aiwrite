import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "aiwrite",
  description: "AI-powered writing application",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
