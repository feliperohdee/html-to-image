import type { Options } from './types';
import { fetchAsDataURL } from './dataurl';
import { shouldEmbed, embedResources } from './embed-resources';

type Metadata = {
	cssText: string;
	url: string;
};

const cssFetchCache: { [href: string]: Metadata } = {};

export const clearCSSCache = () => {
	Object.keys(cssFetchCache).forEach(key => {
		delete cssFetchCache[key];
	});
};

const fetchCSS = async (url: string) => {
	let cache = cssFetchCache[url];
	if (cache != null) {
		return cache;
	}

	const res = await fetch(url);
	const cssText = await res.text();
	cache = { cssText, url };

	cssFetchCache[url] = cache;

	return cache;
};

const embedFonts = async (
	data: Metadata,
	options: Options
): Promise<string> => {
	let cssText = data.cssText;
	const regexUrl = /url\(["']?([^"')]+)["']?\)/g;
	const fontLocs = cssText.match(/url\([^)]+\)/g) || [];
	const loadFonts = fontLocs.map(async (loc: string) => {
		let url = loc.replace(regexUrl, '$1');
		if (!url.startsWith('https://')) {
			url = new URL(url, data.url).href;
		}

		return fetchAsDataURL<[string, string]>(
			url,
			options.fetchRequestInit,
			({ result }) => {
				cssText = cssText.replace(loc, `url(${result})`);
				return [loc, result];
			}
		);
	});

	await Promise.all(loadFonts);
	return cssText;
};

const parseCSS = (source: string) => {
	if (source == null) {
		return [];
	}

	const result: string[] = [];
	const commentsRegex = /(\/\*[\s\S]*?\*\/)/gi;
	let cssText = source.replace(commentsRegex, '');

	const keyframesRegex = new RegExp(
		'((@.*?keyframes [\\s\\S]*?){([\\s\\S]*?}\\s*?)})',
		'gi'
	);

	while (true) {
		const matches = keyframesRegex.exec(cssText);
		if (matches === null) {
			break;
		}
		result.push(matches[0]);
	}
	cssText = cssText.replace(keyframesRegex, '');

	const importRegex = /@import[\s\S]*?url\([^)]*\)[\s\S]*?;/gi;
	const combinedCSSRegex =
		'((\\s*?(?:\\/\\*[\\s\\S]*?\\*\\/)?\\s*?@media[\\s\\S]' +
		'*?){([\\s\\S]*?)}\\s*?})|(([\\s\\S]*?){([\\s\\S]*?)})';
	const unifiedRegex = new RegExp(combinedCSSRegex, 'gi');

	while (true) {
		let matches = importRegex.exec(cssText);
		if (matches === null) {
			matches = unifiedRegex.exec(cssText);
			if (matches === null) {
				break;
			} else {
				importRegex.lastIndex = unifiedRegex.lastIndex;
			}
		} else {
			unifiedRegex.lastIndex = importRegex.lastIndex;
		}
		result.push(matches[0]);
	}

	return result;
};

const getCSSRules = async (
	styleSheets: CSSStyleSheet[],
	options: Options
): Promise<CSSStyleRule[]> => {
	const ret: CSSStyleRule[] = [];
	const deferreds: Promise<void>[] = [];

	styleSheets.forEach(sheet => {
		if ('cssRules' in sheet) {
			try {
				Array.from<CSSRule>(sheet.cssRules || []).forEach(
					(item, index) => {
						if (item.type === CSSRule.IMPORT_RULE) {
							let importIndex = index + 1;
							const url = (item as CSSImportRule).href;
							const deferred = (async () => {
								try {
									const metadata = await fetchCSS(url);
									const cssText = await embedFonts(
										metadata,
										options
									);
									parseCSS(cssText).forEach(rule => {
										try {
											sheet.insertRule(
												rule,
												rule.startsWith('@import')
													? (importIndex += 1)
													: sheet.cssRules.length
											);
										} catch (error) {
											console.error(
												'Error inserting rule from remote css',
												{
													error,
													rule
												}
											);
										}
									});
								} catch (e) {
									console.error(
										'Error loading remote css',
										(e as Error).toString()
									);
								}
							})();

							deferreds.push(deferred);
						}
					}
				);
			} catch (e) {
				const inline =
					styleSheets.find(a => {
						return a.href == null;
					}) || document.styleSheets[0];
				if (sheet.href != null) {
					const deferred = (async () => {
						try {
							const metadata = await fetchCSS(sheet.href!);
							const cssText = await embedFonts(metadata, options);
							parseCSS(cssText).forEach(rule => {
								inline.insertRule(rule, inline.cssRules.length);
							});
						} catch (err: unknown) {
							console.error(
								'Error loading remote stylesheet',
								err
							);
						}
					})();

					deferreds.push(deferred);
				}
				console.error('Error inlining remote css file', e);
			}
		}
	});

	await Promise.all(deferreds);

	styleSheets.forEach(sheet => {
		if ('cssRules' in sheet) {
			try {
				Array.from(sheet.cssRules || []).forEach(item => {
					ret.push(item as CSSStyleRule);
				});
			} catch (e) {
				console.error(
					`Error while reading CSS rules from ${sheet.href}`,
					e
				);
			}
		}
	});

	return ret;
};

const getWebFontRules = (cssRules: CSSStyleRule[]): CSSStyleRule[] => {
	return cssRules
		.filter(rule => {
			return rule.type === CSSRule.FONT_FACE_RULE;
		})
		.filter(rule => {
			return shouldEmbed(rule.style.getPropertyValue('src'));
		});
};

const parseWebFontRules = async <T extends HTMLElement>(
	node: T,
	options: Options
) => {
	if (node.ownerDocument == null) {
		throw new Error('Provided element is not within a Document');
	}

	const styleSheets = Array.from<CSSStyleSheet>(
		node.ownerDocument.styleSheets
	);
	const cssRules = await getCSSRules(styleSheets, options);

	return getWebFontRules(cssRules);
};

const normalizeFontFamily = (font: string) => {
	return font.trim().replace(/["']/g, '');
};

const getUsedFonts = (node: HTMLElement) => {
	const fonts = new Set<string>();
	const traverse = (node: HTMLElement) => {
		const fontFamily =
			node.style.fontFamily || getComputedStyle(node).fontFamily;
		fontFamily.split(',').forEach(font => {
			fonts.add(normalizeFontFamily(font));
		});

		Array.from(node.children).forEach(child => {
			if (child instanceof HTMLElement) {
				traverse(child);
			}
		});
	};
	traverse(node);
	return fonts;
};

export const getWebFontCSS = async <T extends HTMLElement>(
	node: T,
	options: Options
): Promise<string> => {
	const rules = await parseWebFontRules(node, options);
	const usedFonts = getUsedFonts(node);
	const cssTexts = await Promise.all(
		rules
			.filter(rule => {
				return usedFonts.has(
					normalizeFontFamily(
						rule.style.fontFamily ||
							rule.style.getPropertyValue('font-family')
					)
				);
			})
			.map(rule => {
				const baseUrl = rule.parentStyleSheet
					? rule.parentStyleSheet.href
					: null;
				return embedResources(rule.cssText, baseUrl, options);
			})
	);

	return cssTexts.join('\n');
};

export const embedWebFonts = async <T extends HTMLElement>(
	clonedNode: T,
	options: Options
) => {
	const cssText =
		options.fontEmbedCSS != null
			? options.fontEmbedCSS
			: options.skipFonts
			? null
			: await getWebFontCSS(clonedNode, options);

	if (cssText) {
		const styleNode = document.createElement('style');
		const styleContent = document.createTextNode(cssText);

		styleNode.appendChild(styleContent);

		if (clonedNode.firstChild) {
			clonedNode.insertBefore(styleNode, clonedNode.firstChild);
		} else {
			clonedNode.appendChild(styleNode);
		}
	}
};
