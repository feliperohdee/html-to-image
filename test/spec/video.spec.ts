import { describe, it } from 'vitest'

import { delay } from '../../src/util'
import { bootstrap, renderAndCheck } from './helper'

describe('work with video element', () => {
  it('should render video element', async () => {
    const node = await bootstrap('video/node.html', 'video/style.css', 'video/image')
    await delay(1000)(node)
    await renderAndCheck(node)
  })

  it('should render video element with poster', async () => {
    const node = await bootstrap('video/poster.html', 'video/style.css', 'video/image-poster')
    await delay(1000)(node)
    await renderAndCheck(node)
  })
})
