import { describe, expect, it } from 'vitest'

import htmlToImage from '../../src'
import {
  assertTextRendered,
  bootstrap,
  check,
  compareToRefImage,
  drawDataUrl,
  getSvgDocument,
} from './helper'

describe('work with options', () => {
  it('should apply width and height options to node copy being rendered', async () => {
    const node = await bootstrap(
      'dimensions/node.html',
      'dimensions/style.css',
      'dimensions/image',
    )
    const dataUrl = await htmlToImage.toPng(node, { height: 200, width: 200 })
    const imgData = await drawDataUrl(dataUrl, { height: 200, width: 200 })
    compareToRefImage(imgData)
  })

  it('should render backgroundColor', async () => {
    const node = await bootstrap('bgcolor/node.html', 'bgcolor/style.css', 'bgcolor/image')
    const png = await htmlToImage.toPng(node, { backgroundColor: '#ff0000' })
    await check(png)
  })

  it('should render backgroundColor in SVG', async () => {
    const node = await bootstrap('bgcolor/node.html', 'bgcolor/style.css', 'bgcolor/image')
    const svg = await htmlToImage.toSvg(node, { backgroundColor: '#ff0000' })
    await check(svg)
  })

  it('should apply style text to node copy being rendered', async () => {
    const node = await bootstrap('style/node.html', 'style/style.css', 'style/image')
    const png = await htmlToImage.toPng(node, {
      style: { backgroundColor: 'red', transform: 'scale(0.5)' },
    })
    await check(png)
  })

  it('should only clone specified style properties when includeStyleProperties is provided', async () => {
    const node = await bootstrap('style/node.html', 'style/style.css', 'style/image-include-style')
    const png = await htmlToImage.toPng(node, {
      includeStyleProperties: ['width', 'height'],
    })
    await check(png)
  })

  it('should combine dimensions and style', async () => {
    const node = await bootstrap('scale/node.html', 'scale/style.css', 'scale/image')
    const dataUrl = await htmlToImage.toPng(node, {
      height: 200,
      style: {
        transform: 'scale(2)',
        transformOrigin: 'top left',
      },
      width: 200,
    })
    const imgData = await drawDataUrl(dataUrl, { height: 200, width: 200 })
    compareToRefImage(imgData)
  })

  it('should use node filter', async () => {
    const node = await bootstrap('filter/node.html', 'filter/style.css', 'filter/image')
    const png = await htmlToImage.toPng(node, {
      filter(n) {
        if (n.classList) {
          return !n.classList.contains('omit')
        }
        return true
      },
    })
    await check(png)
  })

  it('should not apply node filter to root node', async () => {
    const node = await bootstrap('filter/node.html', 'filter/style.css', 'filter/image')
    const png = await htmlToImage.toPng(node, {
      filter(n) {
        if (n.classList) {
          return n.classList.contains('include')
        }
        return false
      },
    })
    await check(png)
  })

  it('should only use fontEmbedCss if it is supplied', async () => {
    const testCss = `
        @font-face {
          name: "Arial";
          src: url("data:AAA") format("woff2");
        }
      `
    const node = await bootstrap('fonts/web-fonts/empty.html', 'fonts/web-fonts/remote.css')
    const svg = await htmlToImage.toSvg(node, { fontEmbedCSS: testCss })
    const doc = await getSvgDocument(svg)
    const styles = Array.from(doc.getElementsByTagName('style'))
    expect(styles).toHaveLength(1)
    expect(styles[0].textContent).toEqual(testCss)
  })

  it('should embed only the preferred font', async () => {
    const node = await bootstrap('fonts/web-fonts/empty.html', 'fonts/web-fonts/remote.css')
    const svg = await htmlToImage.toSvg(node, { preferredFontFormat: 'woff2' })
    const doc = await getSvgDocument(svg)
    const [style] = Array.from(doc.getElementsByTagName('style'))
    expect(style.textContent).toMatch(/url\([^)]+\) format\("woff2"\)/)
    expect(style.textContent).not.toMatch(/url\([^)]+\) format\("woff"\)/)
  })

  it('should support cache busting', async () => {
    const node = await bootstrap('images/node.html', 'images/style.css')
    assertTextRendered(['PNG', 'JPG'], { cacheBust: true })(node)
  })
})
