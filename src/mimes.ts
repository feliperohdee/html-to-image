const JPEG = 'image/jpeg';
const WOFF = 'application/font-woff';
const mimes: { [key: string]: string } = {
	eot: 'application/vnd.ms-fontobject',
	gif: 'image/gif',
	jpeg: JPEG,
	jpg: JPEG,
	png: 'image/png',
	svg: 'image/svg+xml',
	tiff: 'image/tiff',
	ttf: 'application/font-truetype',
	webp: 'image/webp',
	woff: WOFF,
	woff2: WOFF
};

const getExtension = (url: string): string => {
	const match = /\.([^./]*?)$/g.exec(url);
	return match ? match[1] : '';
};

export const getMimeType = (url: string): string => {
	const extension = getExtension(url).toLowerCase();
	return mimes[extension] || '';
};
