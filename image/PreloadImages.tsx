import ClientImage from './ClientImage.tsx';
import { type ImageSource, isStaticRequire } from './index.ts';

interface Props {
	images: ImageSource[];
}

export default function PreloadImages(prop: Props) {
	return (
		<div style={{ display: 'none' }}>
			{prop.images.map((image) => {
				let key: null | string = null;
				if (typeof image === 'string') {
					key = image;
				} else if (isStaticRequire(image)) {
					key = image.default.src;
				} else {
					key = image.src;
				}

				return <ClientImage style={{ display: 'none' }} key={`PreloadImages${key}`} src={image} alt={'prefetch image'} loading="eager" priority={false} />;
			})}
		</div>
	);
}
