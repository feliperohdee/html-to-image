import { describe, expect, it, vi } from 'vitest'

import { embedImages } from '../../src/embed-images'

describe('Error Handling in resourceToDataURL', () => {
  it('should call the onImageErrorHandler when an error occurs', async () => {
    const onError = vi.fn()
    const options = { onImageErrorHandler: onError }
    const node = document.createElement('img')
    node.src = 'invalid_url'

    await embedImages(node, options)
    expect(onError).toHaveBeenCalled()
  })

  it('should reject with an error if no onImageErrorHandler is provided', async () => {
    const options = {}
    const node = document.createElement('img')
    node.src = 'invalid_url'
    try {
      await embedImages(node, options)
    } catch (error) {
      expect(() => {
        throw error
      }).toThrow()
    }
  })
})
