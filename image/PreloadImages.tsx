// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, January 2025

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
