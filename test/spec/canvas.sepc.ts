import { describe, it } from 'vitest'

import { bootstrap, renderAndCheck } from './helper'

describe('work with canvas element', () => {
  it.skip('should render canvas element', async () => {
    const node = await bootstrap('canvas/node.html', 'canvas/style.css', 'canvas/image')
    const canvas = node.querySelector('#content') as HTMLCanvasElement
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#000000'
    ctx.font = '40px serif'
    ctx.fillText('AB2哈', 40, 40)
    await renderAndCheck(node)
  })
})
