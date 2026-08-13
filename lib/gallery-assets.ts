export const galleryAssets = [
  { value: "summer-wake-aerial", label: "Wakeboard z drona", path: "/media/summer-wake-aerial.jpg", alt: "Wakeboard z lotu ptaka na Jeziorze Łąckim", layout: "large", fit: "cover", position: "60% 50%", season: "Lato" },
  { value: "summer-double-wake", label: "Podwójny wakeboard", path: "/media/summer-double-wake.jpg", alt: "Dwie osoby na wakeboardzie za łodzią SHOWteam", layout: "wide", fit: "cover", position: "50% 50%", season: "Lato" },
  { value: "summer-sailing-drone", label: "Katamaran z drona", path: "/media/summer-sailing-drone.jpg", alt: "Katamaran SHOWteam na Jeziorze Łąckim", layout: "square", fit: "cover", position: "35% 50%", season: "Lato" },
  { value: "summer-sunset-wake", label: "Ślad łodzi o zachodzie", path: "/media/summer-sunset-wake.jpg", alt: "Łódź SHOWteam na jeziorze o zachodzie słońca", layout: "wide", fit: "cover", position: "50% 50%", season: "Lato" },
  { value: "padel", label: "Padel z drona", path: "/media/padel.jpg", alt: "Kort do padla z lotu ptaka", layout: "square", fit: "cover", position: "50% 50%", season: "Lato" },
  { value: "ferrata", label: "Via ferrata", path: "/media/ferrata.jpg", alt: "Wyprawa SHOWteam via ferrata", layout: "tall", fit: "cover", position: "50% 35%", season: "Zima" },
  { value: "andorra", label: "Andorra — kolaż", path: "/media/showteam-andorra-collage.jpg", alt: "Zimowy wyjazd SHOWteam do Andorry", layout: "square", fit: "contain", position: "50% 50%", season: "Zima" },
  { value: "winter-fire", label: "Zima i pochodnie", path: "/media/showteam-winter-fire.jpg", alt: "Wieczór z pochodniami podczas SHOWzimy", layout: "square", fit: "contain", position: "50% 50%", season: "Zima" },
  { value: "trentino", label: "Trentino — kolaż", path: "/media/showteam-trentino-collage.jpg", alt: "SHOWteam w Trentino", layout: "square", fit: "contain", position: "50% 50%", season: "Zima" },
  { value: "instagram-garda", label: "Instagram — Lago di Garda", path: "/media/instagram-garda.jpg", alt: "Lago di Garda z SHOWteam", layout: "tall", fit: "cover", position: "50% 50%", season: "Zima" },
  { value: "instagram-snow", label: "Instagram — panorama śniegu", path: "/media/instagram-snow-panorama.jpg", alt: "Śnieżne panoramy z wyjazdu SHOWteam", layout: "tall", fit: "contain", position: "50% 50%", season: "Zima" },
  { value: "instagram-catamarans", label: "Instagram — katamarany", path: "/media/instagram-catamarans.jpg", alt: "Katamarany SHOWteam na Jeziorze Łąckim", layout: "wide", fit: "cover", position: "50% 50%", season: "Lato" },
] as const;

export type GalleryAssetValue = (typeof galleryAssets)[number]["value"];

export function findGalleryAsset(value: unknown) {
  return galleryAssets.find((asset) => asset.value === value);
}
