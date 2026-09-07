import fs from "node:fs";
import path from "node:path";

const appRoot = process.argv[2];
if (!appRoot) {
	throw new Error("Expected the freshly installed application root.");
}

const logos = fs.readFileSync(path.join(appRoot, "src/components/logos19.tsx"), "utf8");

if (!logos.includes('import { StaticImage } from "cstd-next/media/image/static-image.jsx";')) {
	throw new Error("Logos must use the platform StaticImage component.");
}

if (logos.includes("<img ")) {
	throw new Error("Logos must not render native image elements.");
}

if (!logos.includes("logos.map((logo) =>") || !logos.includes("key={logo.src}")) {
	throw new Error("Logo items must use their stable source as the React key.");
}
