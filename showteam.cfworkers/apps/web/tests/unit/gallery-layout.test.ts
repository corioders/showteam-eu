import { describe, expect, it } from "vitest";

import { defaultMobileLayout, galleryLayoutClass, galleryMobileClass } from "../../src/lib/gallery-layout";

describe("gallery layout", () => {
	it("maps desktop tile sizes to the editorial grid", () => {
		expect(galleryLayoutClass("large")).toBe("md:col-span-2 md:row-span-2");
		expect(galleryLayoutClass("wide")).toBe("md:col-span-2");
		expect(galleryLayoutClass("tall")).toBe("md:row-span-2");
		expect(galleryLayoutClass("square")).toBe("");
	});

	it("keeps useful photo proportions on phones", () => {
		expect(galleryMobileClass("landscape")).toBe("aspect-[16/10]");
		expect(galleryMobileClass("portrait")).toBe("aspect-[4/5]");
		expect(galleryMobileClass("square")).toBe("aspect-[1/1]");
		expect(defaultMobileLayout("wide")).toBe("landscape");
		expect(defaultMobileLayout("tall")).toBe("portrait");
		expect(defaultMobileLayout("square")).toBe("square");
	});
});
