import fs from "node:fs";
import path from "node:path";

const appRoot = process.argv[2];
if (!appRoot) {
	throw new Error("Expected the freshly installed application root.");
}

const marquee = fs.readFileSync(path.join(appRoot, "src/components/marquee-logos-1.tsx"), "utf8");

if (!marquee.includes('import { StaticImage } from "cstd-next/media/image/static-image.jsx";')) {
	throw new Error("Marquee logos must use the platform StaticImage component.");
}

if (marquee.includes("<img ")) {
	throw new Error("Marquee logos must not render native image elements.");
}

if (!marquee.includes("export const MarqueeLogos1")) {
	throw new Error("Marquee logos must use a discoverable named export.");
}

if (marquee.includes("export default")) {
	throw new Error("Marquee logos must not use a default export.");
}
