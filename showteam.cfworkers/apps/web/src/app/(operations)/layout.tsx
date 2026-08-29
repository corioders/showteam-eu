// biome-ignore-all lint/style/noDefaultExport: Next.js, Payload, and tool configs require default exports.
import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import { Suspense } from "react";
import "../globals.css";
import "../(payload)/custom.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-body", display: "swap" });
const oswald = Oswald({ subsets: ["latin", "latin-ext"], variable: "--font-display", display: "swap" });
export const metadata: Metadata = { title: "Operacje | SHOWteam", robots: { index: false, follow: false } };
export const viewport: Viewport = { themeColor: "#080a0b", width: "device-width", initialScale: 1 };
export default function OperationsLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="pl" className={`${inter.variable} ${oswald.variable}`}>
			<body>
				<Suspense fallback={null}>{children}</Suspense>
			</body>
		</html>
	);
}
