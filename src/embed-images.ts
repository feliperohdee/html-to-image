import type { Options } from './types';
import { embedResources } from './embed-resources';
import { isInstanceOfElement } from './util';
import { isDataUrl, resourceToDataURL } from './dataurl';
import { getMimeType } from './mimes';

const embedBackground = async <T extends HTMLElement>(
	clonedNode: T,
	options: Options
) => {
	(await embedProp('background', clonedNode, options)) ||
		(await embedProp('background-image', clonedNode, options));
	(await embedProp('mask', clonedNode, options)) ||
		(await embedProp('-webkit-mask', clonedNode, options)) ||
		(await embedProp('mask-image', clonedNode, options)) ||
		(await embedProp('-webkit-mask-image', clonedNode, options));
};

const embedChildren = async <T extends HTMLElement>(
	clonedNode: T,
	options: Options
) => {
	const children = Array.from<HTMLElement>(
		clonedNode.childNodes as unknown as HTMLElement[]
	);
	await Promise.all(
		children.map(child => {
			return embedImages(child, options);
		})
	);
};

const embedImageNode = async <T extends HTMLElement | SVGImageElement>(
	clonedNode: T,
	options: Options
) => {
	const isImageElement = isInstanceOfElement(clonedNode, HTMLImageElement);

	if (
		!(isImageElement && !isDataUrl(clonedNode.src)) &&
		!(
			isInstanceOfElement(clonedNode, SVGImageElement) &&
			!isDataUrl(clonedNode.href.baseVal)
		)
	) {
		return;
	}

	const url = isImageElement ? clonedNode.src : clonedNode.href.baseVal;

	const dataURL = await resourceToDataURL(url, getMimeType(url), options);
	await new Promise((resolve, reject) => {
		clonedNode.onload = resolve;
		clonedNode.onerror = options.onImageErrorHandler
			? (...attributes) => {
					try {
						resolve(options.onImageErrorHandler!(...attributes));
					} catch (error) {
						reject(error);
					}
			  }
			: reject;

		const image = clonedNode as HTMLImageElement;
		if (image.decode) {
			image.decode = resolve as any;
		}

		if (image.loading === 'lazy') {
			image.loading = 'eager';
		}

		if (isImageElement) {
			clonedNode.srcset = '';
			clonedNode.src = dataURL;
		} else {
			clonedNode.href.baseVal = dataURL;
		}
	});
};

const embedProp = async (
	propName: string,
	node: HTMLElement,
	options: Options
) => {
	const propValue = node.style?.getPropertyValue(propName);
	if (propValue) {
		const cssString = await embedResources(propValue, null, options);
		node.style.setProperty(
			propName,
			cssString,
			node.style.getPropertyPriority(propName)
		);
		return true;
	}
	return false;
};

const embedImages = async <T extends HTMLElement>(
	clonedNode: T,
	options: Options
) => {
	if (isInstanceOfElement(clonedNode, Element)) {
		await Promise.all([
			embedBackground(clonedNode, options),
			embedImageNode(clonedNode, options)
		]);
		await embedChildren(clonedNode, options);
	}
};

export { embedImages };
