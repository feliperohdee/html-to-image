<h1 align="center">@feliperohdee/html-to-image</h1>

<p align="center"><strong>✂️ Generates an image from a DOM node using HTML5 canvas and SVG.</strong></p>

## Why this fork

This is a maintained fork of [bubkoo/html-to-image](https://github.com/bubkoo/html-to-image), itself a fork of [tsayen/dom-to-image](https://github.com/tsayen/dom-to-image). The original's last release was v1.11.13, in February 2025, and it has only received automated contributor updates since. This fork fixes the bugs below and a few slow spots, while keeping the same API: switching is a matter of changing the import.

### Fixes

- **Safari and every browser on iPhone**: box-shadows came out shifted and unblurred whenever the image was rendered at a scale (`pixelRatio` other than 1, which is the default on any retina screen). WebKit draws an SVG's shadows wrong when the SVG goes straight into a canvas, so in WebKit the SVG is now rendered to the final size with `createImageBitmap` first. Chrome and Firefox keep drawing it straight into the canvas, where their shadows were always right.
- **Firefox**: embedding web fonts crashed (`can't access property "trim"`), because Firefox leaves `fontFamily` undefined on `@font-face` rules. The family is now read with `getPropertyValue('font-family')` when that happens.
- **`toBlob`** ignored the `type` and `quality` options and always returned a PNG.
- **`toPixelData`** returned only the top-left part of the image when `pixelRatio` was not 1: it read the node's size instead of the canvas's.
- **`toCanvas`** set the canvas CSS size without a unit (`width: 300`), which browsers ignore; it is now `300px`.

### Optimizations

- A node's children are cloned in parallel, and the URLs inside a CSS value are fetched in parallel; the original did both one at a time.
- Resolving a relative URL reuses one detached document instead of creating a new one per URL.
- `clearCache()` empties the fetched resources and stylesheets the library keeps between calls; the original kept them for the page's whole life.
- Shipped as a single ESM bundle with types and no runtime dependencies.

## Install

```shell
npm install @feliperohdee/html-to-image
```

```shell
yarn add @feliperohdee/html-to-image
```

## Usage

```js
import htmlToImage from '@feliperohdee/html-to-image';
import { toBlob, toCanvas, toJpeg, toPixelData, toPng, toSvg } from '@feliperohdee/html-to-image';
```

Every function takes a DOM node and the rendering [options](#options), and returns a promise:

- [toPng](#topng)
- [toSvg](#tosvg)
- [toJpeg](#tojpeg)
- [toBlob](#toblob)
- [toCanvas](#tocanvas)
- [toPixelData](#topixeldata)
- [getFontEmbedCSS](#fontembedcss)
- [clearCache](#clearcache)

#### toPng

Get a PNG image base64-encoded data URL and display it right away:

```js
const node = document.getElementById('my-node');

try {
	const dataUrl = await toPng(node);
	const img = new Image();

	img.src = dataUrl;
	document.body.appendChild(img);
} catch (err) {
	console.error('oops, something went wrong!', err);
}
```

#### toSvg

Get an SVG data URL, but filter out all the `<i>` elements:

```js
const filter = node => {
	return node.tagName !== 'I';
};

const dataUrl = await toSvg(document.getElementById('my-node'), { filter });
```

#### toJpeg

Save and download a compressed JPEG image:

```js
const dataUrl = await toJpeg(document.getElementById('my-node'), { quality: 0.95 });
const link = document.createElement('a');

link.download = 'my-image-name.jpeg';
link.href = dataUrl;
link.click();
```

#### toBlob

Get a PNG image blob and download it:

```js
const blob = await toBlob(document.getElementById('my-node'));
const link = document.createElement('a');

link.download = 'my-node.png';
link.href = URL.createObjectURL(blob);
link.click();
```

#### toCanvas

Get an `HTMLCanvasElement` and display it right away:

```js
const canvas = await toCanvas(document.getElementById('my-node'));

document.body.appendChild(canvas);
```

#### toPixelData

Get the raw pixel data as a [Uint8ClampedArray](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8ClampedArray), every 4 elements being the RGBA values of one pixel. The array covers the whole canvas, so with a `pixelRatio` it is `pixelRatio` times wider and taller than the node:

```js
const node = document.getElementById('my-node');
const pixelRatio = 1;
const pixels = await toPixelData(node, { pixelRatio });
const width = node.scrollWidth * pixelRatio;

for (let y = 0; y < node.scrollHeight * pixelRatio; y++) {
	for (let x = 0; x < width; x++) {
		const offset = (y * width + x) * 4;
		// the RGBA values of the pixel at (x, y), each in 0..255
		const pixel = pixels.slice(offset, offset + 4);
	}
}
```

#### clearCache

Images, fonts and stylesheets fetched during a render are cached, so the next render of the same page is fast. `clearCache()` empties that cache, for when the resources behind the same URLs have changed:

```js
import { clearCache } from '@feliperohdee/html-to-image';

clearCache();
```

#### React

```tsx
import { useCallback, useRef } from 'react';
import { toPng } from '@feliperohdee/html-to-image';

const App = () => {
	const ref = useRef<HTMLDivElement>(null);

	const downloadImage = useCallback(async () => {
		if (!ref.current) {
			return;
		}

		try {
			const dataUrl = await toPng(ref.current, { cacheBust: true });
			const link = document.createElement('a');

			link.download = 'my-image-name.png';
			link.href = dataUrl;
			link.click();
		} catch (err) {
			console.log(err);
		}
	}, []);

	return (
		<>
			<div ref={ref}>{/* DOM nodes you want to convert to PNG */}</div>
			<button onClick={downloadImage}>Click me</button>
		</>
	);
};
```

## Options

### filter

```ts
(domNode: HTMLElement) => boolean
```

A function taking a DOM node as argument. Should return `true` if the node should be included in the output. Excluding a node excludes its children as well. Not called on the root node.

```ts
const filter = (node: HTMLElement) => {
	const exclusionClasses = ['remove-me', 'secret-div'];

	return !exclusionClasses.some(className => {
		return node.classList?.contains(className);
	});
};

await toJpeg(node, { filter, quality: 0.95 });
```

### backgroundColor

A string value for the background color, any valid CSS color value.

### width, height

Width and height in pixels to be applied to the node before rendering.

### canvasWidth, canvasHeight

Scales the canvas, and everything inside it, to the given width and height in pixels. The final canvas size is `canvasWidth * pixelRatio` by `canvasHeight * pixelRatio`.

### style

An object whose properties are copied to the node's style before rendering. See [this reference](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Properties_Reference) for the JavaScript names of CSS properties.

### quality

A number between `0` and `1` indicating the image quality (e.g. `0.92` => `92%`) of a JPEG image.

Defaults to `1.0` (`100%`).

### cacheBust

Set to `true` to append the current time as a query string to URL requests, to bust the cache.

Defaults to `false`.

### includeQueryParams

Set to `true` to use the whole URL, query params included, as the cache key. When falsy, the query params are left out of the key.

Defaults to `false`.

### imagePlaceholder

A data URL for a placeholder image used when fetching an image fails.

Defaults to an empty string, which renders empty areas for failed images.

### onImageErrorHandler

An `onerror` handler called when an image in the node fails to load.

### fetchRequestInit

The `init` object passed as the second argument to every `fetch` the library makes (headers, credentials, mode…).

### pixelRatio

The pixel ratio of the captured image. Defaults to the device's pixel ratio. Set `1` to render at the node's CSS size.

### skipFonts

Set to `true` to skip downloading and embedding web fonts.

### preferredFontFormat

The font format to embed. Useful when a web font provider lists several formats in the CSS, for example:

```css
@font-face {
	name: 'proxima-nova';
	src: url('...') format('woff2'), url('...') format('woff'), url('...') format('opentype');
}
```

Every format other than the one given is discarded. When not set, all formats are downloaded and embedded.

### fontEmbedCSS

When supplied, the library skips parsing and embedding the web font URLs found in the CSS and uses this value instead. Combined with `getFontEmbedCSS()`, it runs the embedding once across several calls:

```js
const fontEmbedCSS = await getFontEmbedCSS(element1);

await toSvg(element1, { fontEmbedCSS });
await toSvg(element2, { fontEmbedCSS });
```

### skipAutoScale

When set, the library skips scaling very large DOMs down to fit the canvas size limit. Parts of the image may be lost if set to `true` and you export a very large image.

Defaults to `false`.

### type

The image format returned by `toBlob`. Unsupported formats fall back to `image/png`.

Defaults to `image/png`.

### includeStyleProperties

An array of style property names. When set, only these properties are copied when cloning nodes, which helps in performance-critical cases.

## Browsers

Only the standard library is used, but the browser must support:

- [Promise](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- SVG `<foreignObject>`
- [createImageBitmap](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap), in WebKit only (Safari and every browser on iPhone)

The test suite runs in Chromium through Playwright; the WebKit-specific rendering is also tested in WebKit.

_Internet Explorer is not (and will not be) supported, as it does not support the SVG `<foreignObject>` tag._

## How it works

The library uses a feature of SVG that allows arbitrary HTML content inside the `<foreignObject>` tag. To render a DOM node, it:

1. Clones the original DOM node recursively
2. Computes the style of the node and of each sub-node and copies it to the matching clone
   - and recreates pseudo-elements, since they are not cloned
3. Embeds web fonts
   - finds all the `@font-face` declarations that might represent web fonts
   - parses the file URLs and downloads the files
   - base64-encodes the content and inlines it as data URLs
   - puts all the processed CSS rules into one `<style>` element attached to the clone
4. Embeds images
   - embeds the image URLs of `<img>` elements
   - inlines the images used in `background` CSS properties, the same way as fonts
5. Serializes the cloned node to XML
6. Wraps the XML in a `<foreignObject>` tag, then in an SVG, then makes it a data URL
7. To get PNG content or raw pixel data, loads the SVG in an image and draws it on an off-screen canvas (in Safari, through `createImageBitmap` first), then reads the canvas

## Things to watch out for

- A `<canvas>` inside the node renders fine, unless the canvas is [tainted](https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image).
- Rendering can fail on a huge DOM, because the [data URL size limit varies](https://stackoverflow.com/questions/695151/data-protocol-url-size-limitations/41755526#41755526) between browsers.

## Development

```shell
yarn test
yarn build
```

## License

[MIT](LICENSE). Original work copyright (c) 2017-2025 W.Y. ([bubkoo](https://github.com/bubkoo)).
