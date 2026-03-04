import type { Options } from './types';

let resolverDoc: Document | null = null;
let resolverBase: HTMLBaseElement | null = null;
let resolverAnchor: HTMLAnchorElement | null = null;

const getResolver = () => {
	if (!resolverDoc) {
		resolverDoc = document.implementation.createHTMLDocument();
		resolverBase = resolverDoc.createElement('base');
		resolverAnchor = resolverDoc.createElement('a');
		resolverDoc.head.appendChild(resolverBase);
		resolverDoc.body.appendChild(resolverAnchor);
	}
	return { base: resolverBase!, anchor: resolverAnchor! };
};

export const resolveUrl = (url: string, baseUrl: string | null): string => {
	// url is absolute already
	if (url.match(/^[a-z]+:\/\//i)) {
		return url;
	}

	// url is absolute already, without protocol
	if (url.match(/^\/\//)) {
		return window.location.protocol + url;
	}

	// dataURI, mailto:, tel:, etc.
	if (url.match(/^[a-z]+:/i)) {
		return url;
	}

	const { base, anchor } = getResolver();
	base.href = baseUrl || '';
	anchor.href = url;

	return anchor.href;
};

export const uuid = (() => {
	let counter = 0;

	const random = () => {
		return `0000${((Math.random() * 36 ** 4) << 0).toString(36)}`.slice(-4);
	};

	return () => {
		counter += 1;
		return `u${random()}${counter}`;
	};
})();

let styleProps: string[] | null = null;
export const getStyleProperties = (options: Options = {}): string[] => {
	if (styleProps) {
		return styleProps;
	}

	if (options.includeStyleProperties) {
		styleProps = options.includeStyleProperties;
		return styleProps;
	}

	styleProps = Array.from(window.getComputedStyle(document.documentElement));

	return styleProps;
};

const px = (node: HTMLElement, styleProperty: string) => {
	const win = node.ownerDocument.defaultView || window;
	const val = win.getComputedStyle(node).getPropertyValue(styleProperty);
	return val ? parseFloat(val.replace('px', '')) : 0;
};

const getNodeWidth = (node: HTMLElement) => {
	const leftBorder = px(node, 'border-left-width');
	const rightBorder = px(node, 'border-right-width');
	return node.clientWidth + leftBorder + rightBorder;
};

const getNodeHeight = (node: HTMLElement) => {
	const topBorder = px(node, 'border-top-width');
	const bottomBorder = px(node, 'border-bottom-width');
	return node.clientHeight + topBorder + bottomBorder;
};

export const getImageSize = (
	targetNode: HTMLElement,
	options: Options = {}
) => {
	const width = options.width || getNodeWidth(targetNode);
	const height = options.height || getNodeHeight(targetNode);

	return { width, height };
};

export const getPixelRatio = (): number => {
	return window.devicePixelRatio || 1;
};

// @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas#maximum_canvas_size
const canvasDimensionLimit = 16384;

export const checkCanvasDimensions = (canvas: HTMLCanvasElement) => {
	if (
		canvas.width > canvasDimensionLimit ||
		canvas.height > canvasDimensionLimit
	) {
		const scale =
			canvasDimensionLimit / Math.max(canvas.width, canvas.height);
		canvas.width = Math.floor(canvas.width * scale);
		canvas.height = Math.floor(canvas.height * scale);
	}
};

export const canvasToBlob = (
	canvas: HTMLCanvasElement,
	options: Options = {}
): Promise<Blob | null> => {
	return new Promise(resolve => {
		canvas.toBlob(
			resolve,
			options.type || 'image/png',
			options.quality || 1
		);
	});
};

export const createImage = (url: string): Promise<HTMLImageElement> => {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = async () => {
			await img.decode();
			requestAnimationFrame(() => {
				resolve(img);
			});
		};
		img.onerror = reject;
		img.crossOrigin = 'anonymous';
		img.decoding = 'async';
		img.src = url;
	});
};

export const svgToDataURL = (svg: SVGElement): string => {
	const serialized = new XMLSerializer().serializeToString(svg);
	const encoded = encodeURIComponent(serialized);
	return `data:image/svg+xml;charset=utf-8,${encoded}`;
};

export const nodeToDataURL = (
	node: HTMLElement,
	width: number,
	height: number
): string => {
	const xmlns = 'http://www.w3.org/2000/svg';
	const svg = document.createElementNS(xmlns, 'svg');
	const foreignObject = document.createElementNS(xmlns, 'foreignObject');

	svg.setAttribute('width', `${width}`);
	svg.setAttribute('height', `${height}`);
	svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

	foreignObject.setAttribute('width', '100%');
	foreignObject.setAttribute('height', '100%');
	foreignObject.setAttribute('x', '0');
	foreignObject.setAttribute('y', '0');
	foreignObject.setAttribute('externalResourcesRequired', 'true');

	svg.appendChild(foreignObject);
	foreignObject.appendChild(node);
	return svgToDataURL(svg);
};

export const isInstanceOfElement = <
	T extends typeof Element | typeof HTMLElement | typeof SVGImageElement
>(
	node: Element | HTMLElement | SVGImageElement,
	instance: T
): node is T['prototype'] => {
	if (node instanceof instance) {
		return true;
	}

	const nodePrototype = Object.getPrototypeOf(node);

	if (nodePrototype === null) {
		return false;
	}

	return (
		nodePrototype.constructor.name === instance.name ||
		isInstanceOfElement(nodePrototype, instance)
	);
};
