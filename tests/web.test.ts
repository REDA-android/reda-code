import { describe, it, expect, vi } from 'vitest'
import { WebTools } from '../src/core/tools/web'

describe('WebTools', () => {
  it('fetches and strips HTML tags from web pages', async () => {
    const web = new WebTools()
    const mockHtml = '<html><head><title>Test</title><style>.x{}</style></head><body><h1>Hello World</h1><p>Agent testing</p></body></html>'

    vi.stubGlobal('fetch', async () => {
      return new Response(mockHtml, { status: 200, headers: { 'content-type': 'text/html' } })
    })

    const text = await web.fetchUrl({ url: 'https://example.com' })
    expect(text).toContain('Hello World Agent testing')

    vi.unstubAllGlobals()
  })
})
