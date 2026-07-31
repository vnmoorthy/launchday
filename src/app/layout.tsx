import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://launchday-lemon.vercel.app"),
  title: "LaunchDay — Consent checkout for civilian spaceflight",
  description: "A private, paid, and passenger-controlled mission memory layer.",
  openGraph: {
    title: "LaunchDay — Consent checkout for civilian spaceflight",
    description: "A private, paid, and passenger-controlled mission memory layer.",
    images: [{ url: "/launchday-orbit-hero-nasa.jpg", width: 1920, height: 1280, alt: "Earth at night, photographed from orbit" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
