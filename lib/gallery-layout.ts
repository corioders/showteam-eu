export type DesktopGalleryLayout = "large" | "wide" | "tall" | "square";
export type MobileGalleryLayout = "landscape" | "portrait" | "square";

const desktopClasses: Record<DesktopGalleryLayout, string> = {
  large: "md:col-span-2 md:row-span-2",
  wide: "md:col-span-2",
  tall: "md:row-span-2",
  square: "",
};

const mobileClasses: Record<MobileGalleryLayout, string> = {
  landscape: "aspect-[16/10]",
  portrait: "aspect-[4/5]",
  square: "aspect-[1/1]",
};

export function galleryLayoutClass(layout: DesktopGalleryLayout) {
  return desktopClasses[layout];
}

export function galleryMobileClass(layout: MobileGalleryLayout) {
  return mobileClasses[layout];
}

export function defaultMobileLayout(layout: DesktopGalleryLayout): MobileGalleryLayout {
  if (layout === "tall") return "portrait";
  if (layout === "square") return "square";
  return "landscape";
}
