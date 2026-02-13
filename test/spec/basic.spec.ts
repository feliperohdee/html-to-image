import { describe, expect, it } from 'vitest'

import htmlToImage from '../../src'
import { delay } from '../../src/util'
import {
  assertTextRendered,
  bootstrap,
  check,
  renderAndCheck,
} from './helper'

describe('basic usage', () => {
  it('should render to svg', async () => {
    const node = await bootstrap('small/node.html', 'small/style.css', 'small/image')
    const svg = await htmlToImage.toSvg(node)
    await check(svg)
  })

  it('should render to png', async () => {
    const node = await bootstrap('small/node.html', 'small/style.css', 'small/image')
    const png = await htmlToImage.toPng(node)
    await check(png)
  })

  it('should render to blob', async () => {
    const node = await bootstrap('small/node.html', 'small/style.css', 'small/image')
    const blob = await htmlToImage.toBlob(node)
    const url = URL.createObjectURL(blob!)
    await check(url)
  })

  it('should render to jpeg', async () => {
    const node = await bootstrap('small/node.html', 'small/style.css', 'small/image-jpeg')
    const jpeg = await htmlToImage.toJpeg(node)
    await check(jpeg)
  })

  it('should use quality parameter when rendering to jpeg', async () => {
    const node = await bootstrap('small/node.html', 'small/style.css', 'small/image-jpeg-low')
    const jpeg = await htmlToImage.toJpeg(node, { quality: 0.5 })
    await check(jpeg)
  })

  it('should convert an element to an array of pixels', async () => {
    const node = await bootstrap('pixeldata/node.html', 'pixeldata/style.css')
    const pixels = await htmlToImage.toPixelData(node)

    for (let y = 0; y < node.scrollHeight; y += 1) {
      for (let x = 0; x < node.scrollWidth; x += 1) {
        const rgba = [0, 0, 0, 0]

        if (y < 10) {
          rgba[0] = 255
        } else if (y < 20) {
          rgba[1] = 255
        } else {
          rgba[2] = 255
        }

        if (x < 10) {
          rgba[3] = 255
        } else if (x < 20) {
          rgba[3] = 0.4 * 255
        } else {
          rgba[3] = 0.2 * 255
        }

        const offset = 4 * y * node.scrollHeight + 4 * x

        const target: number[] = []
        pixels.slice(offset, offset + 4).forEach((i) => { return target.push(i) })
        expect(target).toEqual(rgba)
      }
    }
  })

  it('should handle border', async () => {
    const node = await bootstrap('border/node.html', 'border/style.css', 'border/image')
    await renderAndCheck(node)
  })

  it('should render bigger node', async () => {
    const parent = await bootstrap('bigger/node.html', 'bigger/style.css', 'bigger/image')
    const child = parent.querySelector('.dom-child-node') as HTMLDivElement
    for (let i = 0; i < 10; i += 1) {
      parent.appendChild(child.cloneNode(true))
    }
    await renderAndCheck(parent)
  })

  it('should handle "#" in colors and attributes', async () => {
    const node = await bootstrap('hash/node.html', 'hash/style.css', 'small/image')
    await renderAndCheck(node)
  })

  it('should render whole node when its scrolled', async () => {
    const node = await bootstrap('scroll/node.html', 'scroll/style.css', 'scroll/image')
    const scrolled = node.querySelector('#scrolled') as HTMLDivElement
    await renderAndCheck(scrolled)
  })

  it('should render with external stylesheet', async () => {
    const node = await bootstrap('sheet/node.html', 'sheet/style.css', 'sheet/image')
    await delay(1000)(node)
    await renderAndCheck(node)
  })

  it('should render text nodes', async () => {
    const node = await bootstrap('text/node.html', 'text/style.css')
    assertTextRendered(['SOME TEXT', 'SOME MORE TEXT'])(node)
  })

  it('should preserve content of ::before and ::after pseudo elements', async () => {
    const node = await bootstrap('pseudo/node.html', 'pseudo/style.css')
    assertTextRendered([
      'JUSTBEFORE',
      'BOTHBEFORE',
      'JUSTAFTER',
      'BOTHAFTER',
    ])(node)
  })

  it('should render web fonts', async () => {
    const node = await bootstrap('fonts/node.html', 'fonts/style.css')
    await delay(1000)(node)
    assertTextRendered(['apper'])(node)
  })

  it('should render images', async () => {
    const node = await bootstrap('images/node.html', 'images/style.css')
    await delay(500)(node)
    assertTextRendered(['PNG', 'JPG'])(node)
  })

  it('should render webp images', async () => {
    const node = await bootstrap('webp/node.html', 'webp/style.css')
    await delay(500)(node)
    assertTextRendered(['PNG'])(node)
  })

  it('should render background images', async () => {
    const node = await bootstrap('css-bg/node.html', 'css-bg/style.css')
    assertTextRendered(['JPG'])(node)
  })

  it('should render user input from <input>', async () => {
    const text = 'USER INPUT'
    await bootstrap('input/node.html', 'input/style.css')
    const input = document.getElementById('input') as HTMLInputElement
    input.value = text
    assertTextRendered([text])()
  })

  it('should render user input from <textarea>', async () => {
    const text = `USER\nINPUT`
    await bootstrap('textarea/node.html', 'textarea/style.css')
    const input = document.getElementById('input') as HTMLInputElement
    input.value = text
    assertTextRendered([text])()
  })

  it.skip('should render content from <canvas>', async () => {
    const text = 'AB2哈'
    const node = await bootstrap('canvas/node.html', 'canvas/style.css')
    const canvas = node.querySelector('#content') as HTMLCanvasElement
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#000000'
    ctx.font = '40px serif'
    ctx.fillText(text, 40, 40)
    assertTextRendered([text])(node)
  })
})
