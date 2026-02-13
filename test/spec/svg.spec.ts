import { describe, expect, it } from 'vitest'

import htmlToImage from '../../src'
import { bootstrap, getSvgDocument, renderAndCheck } from './helper'

describe('work with svg element', () => {
  it('should render nested svg with broken namespace', async () => {
    const node = await bootstrap('svg-ns/node.html', 'svg-ns/style.css', 'svg-ns/image')
    await renderAndCheck(node)
  })

  it('should render svg `<rect>` with width and heigth', async () => {
    const node = await bootstrap('svg-rect/node.html', 'svg-rect/style.css', 'svg-rect/image')
    await renderAndCheck(node)
  })

  it('should render svg `<rect>` with applied css styles', async () => {
    const node = await bootstrap('svg-color/node.html', 'svg-color/style.css', 'svg-color/image')
    await renderAndCheck(node)
  })

  it('should include a viewBox attribute', async () => {
    await bootstrap('small/node.html', 'small/style.css', 'small/image')
    const svg = await htmlToImage.toSvg(document.getElementById('dom-node') as HTMLDivElement)
    const doc = await getSvgDocument(svg)
    const width = doc.documentElement.getAttribute('width')
    const height = doc.documentElement.getAttribute('height')
    const viewBox = doc.documentElement.getAttribute('viewBox')
    expect(viewBox).toEqual(`0 0 ${width} ${height}`)
  })

  it('should render svg `<image>` with href', async () => {
    const node = await bootstrap('svg-image/node.html', 'svg-image/style.css', 'svg-image/image')
    await renderAndCheck(node)
  })

  it('should render SVG use tags', async () => {
    const node = await bootstrap(
      'svg-use-tag/node.html',
      'svg-use-tag/style.css',
      'svg-use-tag/image',
    )
    await renderAndCheck(node)
  })
})
