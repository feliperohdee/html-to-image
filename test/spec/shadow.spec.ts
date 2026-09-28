import { afterEach, describe, expect, it, vi } from 'vitest';

import htmlToImage from '../../src';
import { drawSvgImage } from '../../src/util';

const BLUE = [0, 0, 255, 255];
const WHITE = [255, 255, 255, 255];

const loadImage = async (src: string) => {
	const img = new Image();

	img.src = src;
	await img.decode();

	return img;
};

const pixel = (
	data: Uint8ClampedArray,
	width: number,
	x: number,
	y: number
) => {
	const index = (y * width + x) * 4;

	return Array.from(data.slice(index, index + 4));
};

describe('box shadow', () => {
	const root = document.createElement('div');

	afterEach(() => {
		root.remove();
	});

	it('should draw the shadow where the page draws it when the render is scaled', async () => {
		root.innerHTML = `
			<div style="align-items:center;background:#ffffff;display:flex;height:200px;justify-content:center;width:200px">
				<div style="background:#ff0000;border-radius:10px;box-shadow:0 20px 0 0 #0000ff;height:100px;overflow:hidden;width:100px"></div>
			</div>
		`;
		document.body.appendChild(root);

		const node = root.firstElementChild as HTMLElement;
		const data = await htmlToImage.toPixelData(node, { pixelRatio: 3 });

		// below the box, inside the 20px offset; above and to the right, only the background.
		expect({
			above: pixel(data, 600, 300, 120),
			below: pixel(data, 600, 300, 480),
			right: pixel(data, 600, 480, 300)
		}).toEqual({ above: WHITE, below: BLUE, right: WHITE });
	});
});

describe('drawSvgImage', () => {
	const RED_SVG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
		'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#ff0000"/></svg>'
	)}`;

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should draw the image straight into the canvas outside WebKit', async () => {
		vi.spyOn(navigator, 'vendor', 'get').mockReturnValue('Google Inc.');

		const createImageBitmap = vi.spyOn(window, 'createImageBitmap');
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d')!;
		const drawImage = vi.spyOn(context, 'drawImage');
		const img = await loadImage(RED_SVG);

		canvas.height = 30;
		canvas.width = 20;
		await drawSvgImage(context, img);

		expect(createImageBitmap).not.toHaveBeenCalled();
		expect(drawImage.mock.calls).toEqual([[img, 0, 0, 20, 30]]);
		expect(Array.from(context.getImageData(10, 15, 1, 1).data)).toEqual([
			255, 0, 0, 255
		]);
	});

	it('should render the image at the canvas size through createImageBitmap in WebKit', async () => {
		vi.spyOn(navigator, 'vendor', 'get').mockReturnValue(
			'Apple Computer, Inc.'
		);

		const createImageBitmap = vi.spyOn(window, 'createImageBitmap');
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d')!;
		const img = await loadImage(RED_SVG);

		canvas.height = 30;
		canvas.width = 20;
		await drawSvgImage(context, img);

		expect(createImageBitmap.mock.calls).toEqual([
			[img, { resizeHeight: 30, resizeQuality: 'high', resizeWidth: 20 }]
		]);
		expect(Array.from(context.getImageData(10, 15, 1, 1).data)).toEqual([
			255, 0, 0, 255
		]);
	});
});
