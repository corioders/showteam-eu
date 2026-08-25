import type { StaticImageImport } from "cstd-next/media/image/static-image-import.js";

import baseLife from "@/app/_assets/base-life.jpg";
import ferrata from "@/app/_assets/ferrata.jpg";
import instagramCatamarans from "@/app/_assets/instagram-catamarans.jpg";
import instagramGarda from "@/app/_assets/instagram-garda.jpg";
import instagramSnow from "@/app/_assets/instagram-snow-panorama.jpg";
import legacyBottom from "@/app/_assets/legacy-light-trails-bottom.jpg";
import legacyTop from "@/app/_assets/legacy-light-trails-top.jpg";
import andorra from "@/app/_assets/showteam-andorra-collage.jpg";
import logo from "@/app/_assets/showteam-logo.svg";
import monkey from "@/app/_assets/showteam-monkey.svg";
import padel from "@/app/_assets/padel.jpg";
import trentino from "@/app/_assets/showteam-trentino-collage.jpg";
import sailingDrone from "@/app/_assets/summer-sailing-drone.jpg";
import summerDoubleWake from "@/app/_assets/summer-double-wake.jpg";
import summerSunsetWake from "@/app/_assets/summer-sunset-wake.jpg";
import summerWakeAerial from "@/app/_assets/summer-wake-aerial.jpg";
import summerWakeHero from "@/app/_assets/summer-wake-hero.jpg";
import winterFire from "@/app/_assets/showteam-winter-fire.jpg";

const STATIC_IMAGES: Record<string, StaticImageImport> = {
	"/media/base-life.jpg": baseLife,
	"/media/ferrata.jpg": ferrata,
	"/media/instagram-catamarans.jpg": instagramCatamarans,
	"/media/instagram-garda.jpg": instagramGarda,
	"/media/instagram-snow-panorama.jpg": instagramSnow,
	"/media/legacy-light-trails-bottom.jpg": legacyBottom,
	"/media/legacy-light-trails-top.jpg": legacyTop,
	"/media/showteam-andorra-collage.jpg": andorra,
	"/media/showteam-logo.svg": logo,
	"/media/showteam-monkey.svg": monkey,
	"/media/padel.jpg": padel,
	"/media/showteam-trentino-collage.jpg": trentino,
	"/media/summer-double-wake.jpg": summerDoubleWake,
	"/media/summer-sailing-drone.jpg": sailingDrone,
	"/media/summer-sunset-wake.jpg": summerSunsetWake,
	"/media/summer-wake-aerial.jpg": summerWakeAerial,
	"/media/summer-wake-hero.jpg": summerWakeHero,
	"/media/showteam-winter-fire.jpg": winterFire,
};

export function resolveStaticImage(path: string): StaticImageImport | undefined {
	return STATIC_IMAGES[path];
}
