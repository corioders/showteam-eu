import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "../globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-body", display: "swap" });
const oswald = Oswald({ subsets: ["latin", "latin-ext"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.showteam.eu"),
  title: { default: "SHOWteam — sport, wyjazdy, emocje", template: "%s | SHOWteam" },
  description: "Aktywne wyjazdy, SHOWCamp, sporty wodne, szkolenia i zimowe wyprawy w stylu SHOWteam.",
  openGraph: {
    title: "SHOWteam — Love the things that make you happy",
    description: "Sport, podróże i emocje. Od Jeziora Łąckiego po Dolomity.",
    type: "website",
    locale: "pl_PL",
  },
  twitter: { card: "summary" },
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl" className={`${inter.variable} ${oswald.variable}`}>
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
