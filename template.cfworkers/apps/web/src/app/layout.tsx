import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

import { env } from "@/env";

const geist = Geist({
	subsets: ["latin-ext"],
	variable: "--font-sans",
});

export const metadata: Metadata = {
	description: "A production-ready Next.js starter for Cloudflare Workers.",
	title: env.APP_ENV === "production" ? "Template" : `Template (${env.APP_ENV})`,
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
};

// biome-ignore lint/style/noDefaultExport: This is a nextjs layout. Export default is required.
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<html lang="en" suppressHydrationWarning={true}>
			<body className={`${geist.variable} bg-background font-sans text-foreground antialiased`}>
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
					{children}
				</ThemeProvider>
			</body>
		</html>
	);
}
