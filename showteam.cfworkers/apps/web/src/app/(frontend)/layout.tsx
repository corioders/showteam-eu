// biome-ignore-all lint/security/noDangerouslySetInnerHtml: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/style/noDefaultExport: Next.js, Payload, and tool configs require default exports.
import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";

import { AnalyticsTracker } from "@/components/analytics-tracker";
import { EditorProvider } from "@/components/editor/editor-provider";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { contact } from "@/lib/offers";
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
		siteName: "SHOWteam",
		images: [{ url: "/media/summer-wake-hero.jpg", width: 1920, height: 1080, alt: "SHOWteam na Jeziorze Łąckim" }],
	},
	twitter: { card: "summary_large_image", images: ["/media/summer-wake-hero.jpg"] },
	icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="pl" className={`${inter.variable} ${oswald.variable}`}>
			<body>
				<AnalyticsTracker />
				<EditorProvider>
					<SiteHeader />
					<main>{children}</main>
					<SiteFooter />
					<EditorToolbar />
				</EditorProvider>
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify({
							"@context": "https://schema.org",
							"@type": "SportsOrganization",
							name: "SHOWteam",
							url: "https://www.showteam.eu",
							logo: "https://www.showteam.eu/apple-touch-icon.png",
							email: contact.email,
							telephone: "+48 500 128 090",
							address: { "@type": "PostalAddress", streetAddress: "Nad Zaporą 21", addressLocality: "Poręba", addressCountry: "PL" },
							sameAs: [contact.instagram, contact.facebook, contact.tiktok],
						}).replace(/</g, "\\u003c"),
					}}
				/>
			</body>
		</html>
	);
}
