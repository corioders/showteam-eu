import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import "../globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-body", display: "swap" });
const oswald = Oswald({ subsets: ["latin", "latin-ext"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "Panel SHOWteam",
  description: "Prosty panel wydarzeń, galerii, ofert i rezerwacji SHOWteam.",
  manifest: "/dodaj/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "SHOWteam" },
  icons: { apple: "/pwa-192.png" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#ff6900", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function UploaderLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pl" className={`${inter.variable} ${oswald.variable}`}><body>{children}</body></html>;
}
