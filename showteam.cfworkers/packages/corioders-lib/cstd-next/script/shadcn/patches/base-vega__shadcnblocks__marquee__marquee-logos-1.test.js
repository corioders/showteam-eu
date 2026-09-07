import fs from "node:fs";
import path from "node:path";

const appRoot = process.argv[2];
if (!appRoot) {
	throw new Error("Expected the freshly installed application root.");
}

const marquee = fs.readFileSync(path.join(appRoot, "src/components/marquee-logos-1.tsx"), "utf8");

if (!marquee.includes('import { OptimizedImage } from "cstd-next/media/image/optimized-image.jsx";')) {
	throw new Error("Marquee logos must use the runtime-safe platform OptimizedImage component.");
}

if (marquee.includes("<img ")) {
	throw new Error("Marquee logos must not render native image elements.");
}

if (marquee.includes("<StaticImage")) {
	throw new Error("Runtime-rendered marquee logos must not require static prerendering.");
}

if (!marquee.includes("export const MarqueeLogos1")) {
	throw new Error("Marquee logos must use a discoverable named export.");
}

if (marquee.includes("export default")) {
	throw new Error("Marquee logos must not use a default export.");
}
