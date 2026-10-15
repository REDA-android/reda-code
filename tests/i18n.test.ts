import { describe, expect, it } from 'vitest'
import { en } from '../src/renderer/src/i18n/en'
import { fr } from '../src/renderer/src/i18n/fr'

describe('i18n', () => {
  it('FR and EN dictionaries have identical keys', () => {
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort())
  })
  it('no empty translations', () => {
    for (const dict of [en, fr]) {
      for (const [k, v] of Object.entries(dict)) expect(v.trim(), k).not.toBe('')
    }
  })
})
