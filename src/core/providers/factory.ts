import type { FetchLike, LLMProvider } from './types'
import type { ProviderId, Settings } from '../../shared/types'
import { AnthropicProvider } from './anthropic'
import { OpenAICompatibleProvider } from './openai'
import { GeminiProvider } from './gemini'

export interface ProviderOptions {
  providerId: ProviderId
  apiKey?: string
  settings: Settings
  fetch?: FetchLike
}

export function createProvider(opts: ProviderOptions): LLMProvider {
  const { providerId, apiKey, settings, fetch: customFetch } = opts

  switch (providerId) {
    case 'anthropic':
      return new AnthropicProvider({
        apiKey: apiKey || '',
        fetch: customFetch
      })

    case 'openai':
      return new OpenAICompatibleProvider({
        id: 'openai',
        apiKey,
        baseUrl: 'https://api.openai.com/v1',
        fetch: customFetch
      })

    case 'groq':
      return new OpenAICompatibleProvider({
        id: 'groq',
        apiKey,
        baseUrl: 'https://api.groq.com/openai/v1',
        fetch: customFetch
      })

    case 'ollama':
      return new OpenAICompatibleProvider({
        id: 'ollama',
        apiKey: 'ollama',
        baseUrl: settings.ollamaBaseUrl || 'http://localhost:11434/v1',
        fetch: customFetch
      })

    case 'gemini':
      return new GeminiProvider({
        apiKey: apiKey || '',
        fetch: customFetch
      })

    default:
      throw new Error(`Unsupported provider: ${providerId}`)
  }
}
