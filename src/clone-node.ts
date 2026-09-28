import type { Options } from './types';
import { clonePseudoElements } from './clone-pseudos';
import { createImage, isInstanceOfElement, getStyleProperties } from './util';
import { getMimeType } from './mimes';
import { resourceToDataURL } from './dataurl';

const cloneCanvasElement = async (canvas: HTMLCanvasElement) => {
	const dataURL = canvas.toDataURL();
	if (dataURL === 'data:,') {
		return canvas.cloneNode(false) as HTMLCanvasElement;
	}
	return createImage(dataURL);
};

const cloneChildren = async <T extends HTMLElement>(
	nativeNode: T,
	clonedNode: T,
	options: Options
): Promise<T> => {
	if (isSVGElement(clonedNode)) {
		return clonedNode;
	}

	let children: T[] = [];

	if (isSlotElement(nativeNode) && nativeNode.assignedNodes) {
		children = Array.from<T>(nativeNode.assignedNodes() as T[]);
	} else if (
		isInstanceOfElement(nativeNode, HTMLIFrameElement) &&
		nativeNode.contentDocument?.body
	) {
		children = Array.from<T>(
			nativeNode.contentDocument.body.childNodes as unknown as T[]
		);
	} else {
		children = Array.from<T>(
			(nativeNode.shadowRoot ?? nativeNode).childNodes as unknown as T[]
		);
	}

	if (
		children.length === 0 ||
		isInstanceOfElement(nativeNode, HTMLVideoElement)
	) {
		return clonedNode;
	}

	const clonedChildren = await Promise.all(
		children.map(child => {
			return cloneNode(child, options);
		})
	);

	clonedChildren.forEach(clonedChild => {
		if (clonedChild) {
			clonedNode.appendChild(clonedChild);
		}
	});

	return clonedNode;
};

const cloneCSSStyle = <T extends HTMLElement>(
	nativeNode: T,
	clonedNode: T,
	options: Options
) => {
	const targetStyle = clonedNode.style;
	if (!targetStyle) {
		return;
	}

	const sourceStyle = window.getComputedStyle(nativeNode);
	if (sourceStyle.cssText) {
		targetStyle.cssText = sourceStyle.cssText;
		targetStyle.transformOrigin = sourceStyle.transformOrigin;
	} else {
		getStyleProperties(options).forEach(name => {
			let value = sourceStyle.getPropertyValue(name);
			if (name === 'font-size' && value.endsWith('px')) {
				const reducedFont =
					Math.floor(
						parseFloat(value.substring(0, value.length - 2))
					) - 0.1;
				value = `${reducedFont}px`;
			}

			if (
				isInstanceOfElement(nativeNode, HTMLIFrameElement) &&
				name === 'display' &&
				value === 'inline'
			) {
				value = 'block';
			}

			if (name === 'd' && clonedNode.getAttribute('d')) {
				value = `path(${clonedNode.getAttribute('d')})`;
			}

			targetStyle.setProperty(
				name,
				value,
				sourceStyle.getPropertyPriority(name)
			);
		});
	}
};

const cloneIFrameElement = async (
	iframe: HTMLIFrameElement,
	options: Options
) => {
	try {
		if (iframe?.contentDocument?.body) {
			return (await cloneNode(
				iframe.contentDocument.body,
				options,
				true
			)) as HTMLBodyElement;
		}
	} catch {
		// Failed to clone iframe
	}

	return iframe.cloneNode(false) as HTMLIFrameElement;
};

const cloneInputValue = <T extends HTMLElement>(
	nativeNode: T,
	clonedNode: T
) => {
	if (isInstanceOfElement(nativeNode, HTMLTextAreaElement)) {
		clonedNode.innerHTML = nativeNode.value;
	}

	if (isInstanceOfElement(nativeNode, HTMLInputElement)) {
		clonedNode.setAttribute('value', nativeNode.value);
	}
};

const cloneSelectValue = <T extends HTMLElement>(
	nativeNode: T,
	clonedNode: T
) => {
	if (isInstanceOfElement(nativeNode, HTMLSelectElement)) {
		const clonedSelect = clonedNode as any as HTMLSelectElement;
		const selectedOption = Array.from(clonedSelect.children).find(child => {
			return nativeNode.value === child.getAttribute('value');
		});

		if (selectedOption) {
			selectedOption.setAttribute('selected', '');
		}
	}
};

const cloneSingleNode = async <T extends HTMLElement>(
	node: T,
	options: Options
): Promise<HTMLElement> => {
	if (isInstanceOfElement(node, HTMLCanvasElement)) {
		return cloneCanvasElement(node);
	}

	if (isInstanceOfElement(node, HTMLVideoElement)) {
		return cloneVideoElement(node, options);
	}

	if (isInstanceOfElement(node, HTMLIFrameElement)) {
		return cloneIFrameElement(node, options);
	}

	return node.cloneNode(isSVGElement(node)) as T;
};

const cloneVideoElement = async (video: HTMLVideoElement, options: Options) => {
	if (video.currentSrc) {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		canvas.width = video.clientWidth;
		canvas.height = video.clientHeight;
		ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
		const dataURL = canvas.toDataURL();
		return createImage(dataURL);
	}

	const poster = video.poster;
	const contentType = getMimeType(poster);
	const dataURL = await resourceToDataURL(poster, contentType, options);
	return createImage(dataURL);
};

const decorate = <T extends HTMLElement>(
	nativeNode: T,
	clonedNode: T,
	options: Options
): T => {
	if (isInstanceOfElement(clonedNode, Element)) {
		cloneCSSStyle(nativeNode, clonedNode, options);
		clonePseudoElements(nativeNode, clonedNode, options);
		cloneInputValue(nativeNode, clonedNode);
		cloneSelectValue(nativeNode, clonedNode);
	}

	return clonedNode;
};

const ensureSVGSymbols = async <T extends HTMLElement>(
	clone: T,
	options: Options
) => {
	const uses = clone.querySelectorAll ? clone.querySelectorAll('use') : [];
	if (uses.length === 0) {
		return clone;
	}

	const processedDefs: { [key: string]: HTMLElement } = {};
	for (let i = 0; i < uses.length; i++) {
		const use = uses[i];
		const id = use.getAttribute('xlink:href');
		if (id) {
			const exist = clone.querySelector(id);
			const definition = document.querySelector(id) as HTMLElement;
			if (!exist && definition && !processedDefs[id]) {
				processedDefs[id] = (await cloneNode(
					definition,
					options,
					true
				))!;
			}
		}
	}

	const nodes = Object.values(processedDefs);
	if (nodes.length) {
		const ns = 'http://www.w3.org/1999/xhtml';
		const svg = document.createElementNS(ns, 'svg');
		svg.setAttribute('xmlns', ns);
		svg.style.display = 'none';
		svg.style.height = '0';
		svg.style.overflow = 'hidden';
		svg.style.position = 'absolute';
		svg.style.width = '0';

		const defs = document.createElementNS(ns, 'defs');
		svg.appendChild(defs);

		for (let i = 0; i < nodes.length; i++) {
			defs.appendChild(nodes[i]);
		}

		clone.appendChild(svg);
	}

	return clone;
};

const isSlotElement = (node: HTMLElement): node is HTMLSlotElement => {
	return node.tagName != null && node.tagName.toUpperCase() === 'SLOT';
};

const isSVGElement = (node: HTMLElement): node is HTMLSlotElement => {
	return node.tagName != null && node.tagName.toUpperCase() === 'SVG';
};

const cloneNode = async <T extends HTMLElement>(
	node: T,
	options: Options,
	isRoot?: boolean
): Promise<T | null> => {
	if (!isRoot && options.filter && !options.filter(node)) {
		return null;
	}

	const singleClone = (await cloneSingleNode(node, options)) as T;
	const withChildren = await cloneChildren(node, singleClone, options);
	const decorated = decorate(node, withChildren, options);
	return ensureSVGSymbols(decorated, options);
};

export { cloneNode };
