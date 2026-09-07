import { OptimizedImage } from "cstd-next/media/image/optimized-image.jsx";

import { Marquee, MarqueeContent, MarqueeItem } from "@/components/kibo-ui/marquee";

export const title = "Logo marquee";

const logos = [
	{
		src: "/image-set/modern/logos/fictional-company-logo-1.svg",
		alt: "Company logo 1",
	},
	{
		src: "/image-set/modern/logos/fictional-company-logo-2.svg",
		alt: "Company logo 2",
	},
	{
		src: "/image-set/modern/logos/fictional-company-logo-3.svg",
		alt: "Company logo 3",
	},
	{
		src: "/image-set/modern/logos/fictional-company-logo-4.svg",
		alt: "Company logo 4",
	},
	{
		src: "/image-set/modern/logos/fictional-company-logo-5.svg",
		alt: "Company logo 5",
	},
];

export const MarqueeLogos1 = () => (
	<div className="w-full max-w-md">
		<Marquee>
			<MarqueeContent>
				{logos.map((logo) => (
					<MarqueeItem key={logo.alt}>
						<OptimizedImage
							alt={logo.alt}
							className="mx-4 h-6 max-w-24 object-contain opacity-80 grayscale dark:invert"
							loading="lazy"
							sizes="96px"
							src={{ contentHash: logo.src, height: 24, img: { src: logo.src }, width: 96 }}
						/>
					</MarqueeItem>
				))}
			</MarqueeContent>
		</Marquee>
	</div>
);
