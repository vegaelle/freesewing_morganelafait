//

import { Design } from '@freesewing/core'
import { i18n } from '../i18n/index.mjs'
import { data } from '../data.mjs'
// Parts
import { front } from './front.mjs'
import { back } from './back.mjs'
import { sleeve } from './sleeve.mjs'

// Create new design
const Egg_bodice = new Design({
  data,
  parts: [front, back, sleeve],
})

// Named exports
export { front, back, sleeve, i18n, Egg_bodice }
