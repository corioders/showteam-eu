// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, March 2025

import type { JSX } from 'react';

export interface PreloadImagesProps {
	images: JSX.Element[];
}

export function PreloadImages(props: PreloadImagesProps) {
	return (
		<>
			{props.images.map((image) => {
				const key = image.key ?? image.props['alt'] ?? image.props['src'];
				return (
					<div
						key={`PreloadImages${key}`}
						style={{ position: 'absolute', overflow: 'hidden', padding: 0, margin: 0, zIndex: -1, border: 'none' }}
						// style={{ opacity: 0, visibility: 'hidden', position: 'absolute', width: '0', height: '0', overflow: 'hidden', padding: 0, margin: '-1px', zIndex: -1, border: 'none' }}
					>
						{image}
					</div>
				);
			})}
		</>
	);
}
