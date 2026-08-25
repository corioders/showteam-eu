// biome-ignore-all lint/style/noDefaultExport: Next.js, Payload, and tool configs require default exports.
// biome-ignore-all lint/style/noExportedImports: Legacy SHOWteam behavior is preserved during the structural template migration.
import { TvScreen } from "@/components/tv-screen";

export const dynamic = "force-dynamic";
export default TvScreen;
