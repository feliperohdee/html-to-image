import { describe, it } from 'vitest'

import htmlToImage from '../../src'
import { delay } from '../../src/util'
import { assertTextRendered, bootstrap, renderAndCheck } from './helper'

describe('special cases', () => {
  it.skip('should not crash when loading external stylesheet causes error', async () => {
    const node = await bootstrap('ext-css/node.html', 'ext-css/style.css')
    await delay(1000)(node)
    await htmlToImage.toPng(node)
  })

  it.skip('should render content from shadow node of custom element', async () => {
    const link = document.createElement('link')
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/mathlive/dist/mathlive.min.js'
    link.rel = 'stylesheet'
    link.crossOrigin = 'anonymous'
    link.href = 'https://unpkg.com/mathlive/dist/mathlive-fonts.css'
    const tasks = [
      new Promise((resolve, reject) => {
        script.onload = resolve
        script.onerror = reject
      }),
      new Promise((resolve, reject) => {
        link.onload = resolve
        link.onerror = reject
      }),
    ]
    document.head.append(script, link)

    await Promise.all(tasks)
    const node = await bootstrap(
      'custom-element/node.html',
      'custom-element/style.css',
      'custom-element/image',
    )
    await delay(1000)(node)
    await renderAndCheck(node)
    link.remove()
    script.remove()
  })

  it('should caputre lazy loading images', async () => {
    const node = await bootstrap('images/loading.html', 'images/style.css')
    assertTextRendered(['PNG', 'JPG'])(node)
  })
})
