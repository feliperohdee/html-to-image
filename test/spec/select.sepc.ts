import { describe, it } from 'vitest'

import { bootstrap, renderAndCheck } from './helper'

describe('work with select element', () => {
  ;['first', 'second', 'third'].forEach((text) => {
    it(`should capture ${text} selected option`, async () => {
      const node = await bootstrap(
        `select/${text}-option.html`,
        'select/style.css',
        `select/${text}`,
      )
      await renderAndCheck(node)
    })
  })
})
