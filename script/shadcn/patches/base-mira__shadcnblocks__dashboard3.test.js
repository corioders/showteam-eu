import fs from "node:fs";
import path from "node:path";

const appRoot = process.argv[2];
if (!appRoot) {
	throw new Error("Expected the freshly installed application root.");
}

const dashboard = fs.readFileSync(path.join(appRoot, "src/components/dashboard3.tsx"), "utf8");
const labels = dashboard.matchAll(/<DropdownMenuLabel[\s\S]*?<\/DropdownMenuLabel>/g);
for (const label of labels) {
	const beforeLabel = dashboard.slice(0, label.index);
	if (beforeLabel.lastIndexOf("<DropdownMenuGroup>") < beforeLabel.lastIndexOf("</DropdownMenuGroup>")) {
		throw new Error("Every dashboard menu label must be inside DropdownMenuGroup for Base UI.");
	}
}

if (dashboard.includes("TooltipProps<number, string>")) {
	throw new Error("Dashboard tooltips must use Recharts TooltipContentProps.");
}
