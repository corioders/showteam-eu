// biome-ignore-all lint/style/noDefaultExport: Next.js, Payload, and tool configs require default exports.
import { QuickUploader } from "@/components/quick-uploader";

export const dynamic = "force-static";

export default function GalleryUploadPage() {
	return <QuickUploader />;
}
