import { describe, expect, it } from 'vitest'

import * as embeding from '../../src/embed-resources'

describe('embeding', () => {
  describe('parseURLs', () => {
    it('should parse urls', () => {
      expect(embeding.parseURLs('url("http://acme.com/file")')).toEqual([
        'http://acme.com/file',
      ])

      expect(embeding.parseURLs("url(foo.com), url('bar.org')")).toEqual([
        'foo.com',
        'bar.org',
      ])
    })

    it('should ignore data urls', () => {
      expect(embeding.parseURLs('url(foo.com), url(data:AAA)')).toEqual([
        'foo.com',
      ])
    })
  })

  describe('embed', () => {
    it('should embed url', async () => {
      const result = await embeding.embed(
        'url(http://acme.com/image.png), url(foo.com)',
        'http://acme.com/image.png',
        null,
        {},
        () => { return Promise.resolve('AAA') },
      )
      expect(result).toEqual('url(data:image/png;base64,AAA), url(foo.com)')
    })

    it('should resolve urls if base url given', async () => {
      const result = await embeding.embed(
        'url(images/image.png)',
        'images/image.png',
        'http://acme.com/',
        {},
        (url) => {
          return Promise.resolve(
            (
              {
                'http://acme.com/images/image.png': 'AAA',
              } as any
            )[url],
          )
        },
      )
      expect(result).toEqual('url(data:image/png;base64,AAA)')
    })
  })
})
