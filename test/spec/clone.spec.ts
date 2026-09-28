import { afterEach, describe, expect, it } from 'vitest';

import htmlToImage from '../../src';

describe('clone node', () => {
	const root = document.createElement('div');

	afterEach(() => {
		root.remove();
	});

	it('should clone a deep tree without waiting between levels', async () => {
		const opening = '<div style="padding:1px">'.repeat(10);
		const closing = '</div>'.repeat(10);

		root.innerHTML = `${opening}deep${closing}`;
		document.body.appendChild(root);

		const started = performance.now();

		await htmlToImage.toSvg(root.firstElementChild as HTMLElement);

		// a queue that polls every 50ms spends at least 500ms on ten levels.
		expect(performance.now() - started).toBeLessThan(250);
	});
});
