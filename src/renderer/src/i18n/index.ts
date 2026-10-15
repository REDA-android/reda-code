import { createContext, useContext } from 'react'
import type { Locale } from '@shared/types'
import { en, type MessageKey } from './en'
import { fr } from './fr'

export const dictionaries: Record<Locale, Record<MessageKey, string>> = { en, fr }

export function translate(locale: Locale, key: MessageKey): string {
  return dictionaries[locale]?.[key] ?? en[key] ?? key
}

export const LocaleContext = createContext<Locale>('fr')

export function useT(): (key: MessageKey) => string {
  const locale = useContext(LocaleContext)
  return (key) => translate(locale, key)
}

export function useTranslation(): { t: (key: MessageKey) => string } {
  const t = useT()
  return { t }
}

export type { MessageKey }
