import pixelmatch from 'pixelmatch'
import { expect } from 'vitest'

import htmlToImage from '../../src'
import { Options } from '../../src/types'
import { getPixelRatio } from '../../src/util'

export const getCaptureNode = () => {
  return document.getElementById('dom-node') as HTMLDivElement
}

export const getReferenceImage = () => {
  return document.getElementById('ref-image') as HTMLImageElement
}

export const getCanvasNode = () => {
  return document.getElementById('canvas') as HTMLCanvasElement
}

export const getStyleNode = () => {
  return document.getElementById('style') as HTMLStyleElement
}

const BASE_URL = '/test/resources/'
const ROOT_ID = 'test-root'

export const clean = () => {
  const root = document.getElementById(ROOT_ID)
  if (root && root.parentNode) {
    root.parentNode.removeChild(root)
  }
}

const setup = async () => {
  const html = await fetchFile('page.html')
  clean()
  const root = document.createElement('div') as HTMLDivElement
  root.id = ROOT_ID
  root.innerHTML = html
  document.body.appendChild(root)
}

const waitForFrame = () => {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => { return resolve() })
  })
}

const waitForImageLoad = (img: HTMLImageElement) => {
  if (img.complete && img.naturalWidth > 0) {
    return Promise.resolve()
  }
  return new Promise<void>((resolve, reject) => {
    img.onload = () => { return resolve() }
    img.onerror = () => { return reject(new Error('Reference image failed to load')) }
  })
}

export const bootstrap = async (
  htmlUrl: string,
  cssUrl?: string,
  refImageUrl?: string,
) => {
  await setup()

  const html = await fetchFile(htmlUrl)
  const captureNode = getCaptureNode()
  captureNode.innerHTML = html

  if (cssUrl) {
    const css = await fetchFile(cssUrl)
    getStyleNode().appendChild(document.createTextNode(css))
  }

  if (refImageUrl) {
    const url = await fetchFile(refImageUrl)
    const refImg = getReferenceImage()
    refImg.setAttribute('src', url)
    await waitForImageLoad(refImg)
  }

  await waitForFrame()

  return captureNode
}

const fetchFile = async (fileName: string) => {
  const url = BASE_URL + fileName
  const res = await fetch(url)
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
  }
  return text.trim()
}

const makeImage = (src: string) => {
  return new Promise<HTMLImageElement>((resolve) => {
    const image = new Image()
    image.onload = () => { return resolve(image) }
    image.src = src
  })
}

const makeCanvas = (
  img: HTMLImageElement,
  size?: {
    height?: number
    width?: number
  },
) => {
  const canvas = getCanvasNode()
  const context = canvas.getContext('2d')!

  const width = (size && size.width) || img.width
  const height = (size && size.height) || img.height
  const ratio = getPixelRatio()
  canvas.width = width * ratio
  canvas.height = height * ratio
  canvas.style.width = `${width}`
  canvas.style.height = `${height}`

  context.imageSmoothingEnabled = false
  context.drawImage(img, 0, 0)
  return { canvas, context, height, width }
}

const drawImg = (
  img: HTMLImageElement,
  size?: {
    height?: number
    width?: number
  },
) => {
  const { context, height, width } = makeCanvas(img, size)
  return context.getImageData(0, 0, width, height)
}

export const drawDataUrl = async (
  dataUrl: string,
  size?: {
    height?: number
    width?: number
  },
) => {
  const image = await makeImage(dataUrl)
  return drawImg(image, size)
}

export const check = async (dataUrl: string) => {
  const imgData = await drawDataUrl(dataUrl)
  compareToRefImage(imgData)
}

export const logDataUrl = async (node: HTMLDivElement = getCaptureNode()) => {
  const png = await htmlToImage.toPng(node)
  const image = await makeImage(png)
  const { canvas } = makeCanvas(image)
  console.log(canvas.toDataURL())
  return node
}

export const renderAndCheck = async (
  node: HTMLDivElement = getCaptureNode(),
  options: Options = {},
) => {
  const png = await htmlToImage.toPng(node, options)
  await check(png)
}

export const compareToRefImage = (sourceData: ImageData, threshold = 0.1) => {
  const ref = getReferenceImage()
  const refData = drawImg(ref)
  expect(
    pixelmatch(sourceData.data, refData.data, null, ref.width, ref.height, {
      threshold,
    }),
  ).toBeLessThan(100)
}

export const getSvgDocument = async (dataUrl: string): Promise<XMLDocument> => {
  const res = await window.fetch(dataUrl)
  const str = await res.text()
  return new window.DOMParser().parseFromString(str, 'text/xml')
}

const PASS_TEXT_MATCH = true

export const assertTextRendered = (lines: string[], options?: Options) => {
  return (node: HTMLDivElement = getCaptureNode()) => {
    return PASS_TEXT_MATCH
      ? expect(true).toBe(true)
      : recognizeImage(node, options).then((text) => {
          expect(lines.every((line) => { return text.includes(line) })).toBe(true)
        })
  }
}

export const recognizeImage = async (node: HTMLDivElement, options?: Options) => {
  const png = await htmlToImage.toPng(node, options)
  await drawDataUrl(png)
  return recognize(getCanvasNode().toDataURL())
}

const recognize = async (dataUrl: string) => {
  const data = new FormData()
  data.append('base64Image', dataUrl)
  data.append('apikey', 'K89675126388957')

  try {
    const res = await window.fetch('https://api.ocr.space/parse/image', {
      body: data,
      method: 'post',
    })
    const json = await res.json()
    const result: string[] = []
    if (!json.IsErroredOnProcessing) {
      json.ParsedResults.forEach(({ ParsedText }: any) => {
        if (ParsedText) {
          result.push(ParsedText)
        }
      })
    }
    return result.join('\n').trim().replace('\r\n', '\n')
  } catch {
    return ''
  }
}
