import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "aiwrite",
  description: "AI-powered writing application",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-display bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100`}
      >
        {children}
      </body>
    </html>
  );
}
