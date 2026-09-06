// biome-ignore-all lint/style/noDefaultExport: Next.js, Payload, and tool configs require default exports.
import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import Script from "next/script";
import "../globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-body", display: "swap" });
const oswald = Oswald({ subsets: ["latin", "latin-ext"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
	title: "Panel SHOWteam",
	description: "Prosty panel wydarzeń, galerii, ofert i rezerwacji SHOWteam.",
	manifest: "/admin.webmanifest",
	appleWebApp: { capable: true, statusBarStyle: "default", title: "SHOWteam" },
	icons: { apple: "/pwa-192.png" },
	robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#ff6900", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function UploaderLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="pl" className={`${inter.variable} ${oswald.variable}`}>
			<head>
				{process.env.NODE_ENV === "development" && <Script src="//unpkg.com/react-grab/dist/index.global.js" crossOrigin="anonymous" strategy="beforeInteractive" />}
			</head>
			<body>{children}</body>
		</html>
	);
}
