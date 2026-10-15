export interface FetchUrlInput {
  url: string
  maxLength?: number
}

export interface SearchWebInput {
  query: string
  maxResults?: number
}

export class WebTools {
  async fetchUrl(input: FetchUrlInput): Promise<string> {
    const res = await fetch(input.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; reda-code/0.1.0)'
      }
    })
    if (!res.ok) {
      throw new Error(`Failed to fetch URL ${input.url}: HTTP ${res.status}`)
    }
    const html = await res.text()
    // Simple HTML to readable text/markdown conversion
    const cleanText = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    const max = input.maxLength || 8000
    return cleanText.length > max ? cleanText.slice(0, max) + '... [truncated]' : cleanText
  }

  async searchWeb(input: SearchWebInput): Promise<string> {
    // Queries DuckDuckGo HTML search API
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(input.query)}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    })
    if (!res.ok) {
      throw new Error(`Search failed: HTTP ${res.status}`)
    }
    const html = await res.text()

    // Extract result snippets
    const regex = /<a class="result__snippet[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g
    const results: string[] = []
    let match: RegExpExecArray | null
    const max = input.maxResults || 5

    while ((match = regex.exec(html)) !== null && results.length < max) {
      const snippet = match[2].replace(/<[^>]+>/g, '').trim()
      results.push(`- ${snippet}`)
    }

    if (results.length === 0) {
      return `No results found for "${input.query}".`
    }
    return results.join('\n')
  }
}
