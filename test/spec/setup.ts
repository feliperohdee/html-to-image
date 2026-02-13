import { afterAll, beforeAll } from 'vitest'

import { clean } from './helper'

let originalPixelRatio: number

beforeAll(() => {
  originalPixelRatio = window.devicePixelRatio
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 1 })
})

afterAll(() => {
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: originalPixelRatio })
  clean()
})
