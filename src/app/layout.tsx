import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LaunchDay — Consent checkout for civilian spaceflight",
  description: "A private, paid, and passenger-controlled mission memory layer.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
