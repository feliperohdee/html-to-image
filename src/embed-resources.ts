import type { Options } from './types';
import { promiseAll } from 'use-async-helpers';
import { resolveUrl } from './util';
import { getMimeType } from './mimes';
import { isDataUrl, makeDataUrl, resourceToDataURL } from './dataurl';

const URL_REGEX = /url\((['"]?)([^'"]+?)\1\)/g;
const URL_WITH_FORMAT_REGEX = /url\([^)]+\)\s*format\((["']?)([^"']+)\1\)/g;
const FONT_SRC_REGEX = /src:\s*(?:url\([^)]+\)\s*format\([^)]+\)[,;]\s*)+/g;

const toRegex = (url: string): RegExp => {
	// eslint-disable-next-line no-useless-escape
	const escaped = url.replace(/([.*+?^${}()|\[\]\/\\])/g, '\\$1');
	return new RegExp(`(url\\(['"]?)(${escaped})(['"]?\\))`, 'g');
};

export const parseURLs = (cssText: string): string[] => {
	const urls: string[] = [];

	cssText.replace(URL_REGEX, (raw, quotation, url) => {
		urls.push(url);
		return raw;
	});

	return urls.filter(url => {
		return !isDataUrl(url);
	});
};

export const embed = async (
	cssText: string,
	resourceURL: string,
	baseURL: string | null,
	options: Options,
	getContentFromUrl?: (url: string) => Promise<string>
): Promise<string> => {
	try {
		const resolvedURL = baseURL
			? resolveUrl(resourceURL, baseURL)
			: resourceURL;
		const contentType = getMimeType(resourceURL);
		let dataURL: string;
		if (getContentFromUrl) {
			const content = await getContentFromUrl(resolvedURL);
			dataURL = makeDataUrl(content, contentType);
		} else {
			dataURL = await resourceToDataURL(
				resolvedURL,
				contentType,
				options
			);
		}
		return cssText.replace(toRegex(resourceURL), `$1${dataURL}$3`);
	} catch {
		// pass
	}
	return cssText;
};

const filterPreferredFontFormat = (
	str: string,
	{ preferredFontFormat }: Options
): string => {
	if (!preferredFontFormat) {
		return str;
	}

	return str.replace(FONT_SRC_REGEX, (match: string) => {
		while (true) {
			const [src, , format] = URL_WITH_FORMAT_REGEX.exec(match) || [];
			if (!format) {
				return '';
			}

			if (format === preferredFontFormat) {
				return `src: ${src};`;
			}
		}
	});
};

export const shouldEmbed = (url: string): boolean => {
	return url.search(URL_REGEX) !== -1;
};

type FetchedResource = {
	dataURL: string;
	url: string;
} | null;

export const embedResources = async (
	cssText: string,
	baseUrl: string | null,
	options: Options
): Promise<string> => {
	if (!shouldEmbed(cssText)) {
		return cssText;
	}

	const filteredCSSText = filterPreferredFontFormat(cssText, options);
	const urls = parseURLs(filteredCSSText);

	const fetched = await promiseAll<FetchedResource>(
		urls.map(url => {
			return async () => {
				try {
					const resolvedURL = baseUrl
						? resolveUrl(url, baseUrl)
						: url;
					const contentType = getMimeType(url);
					const dataURL = await resourceToDataURL(
						resolvedURL,
						contentType,
						options
					);
					return { dataURL, url };
				} catch {
					return null;
				}
			};
		}),
		10
	);

	let result = filteredCSSText;
	for (const entry of fetched) {
		if (entry) {
			result = result.replace(toRegex(entry.url), `$1${entry.dataURL}$3`);
		}
	}

	return result;
};
