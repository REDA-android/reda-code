import { useEffect, useState } from 'react'
import type { Locale, Settings } from '@shared/types'
import { LocaleContext, translate } from './i18n'

export function App(): React.JSX.Element {
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    void window.api.invoke('settings:get').then(setSettings)
  }, [])

  const locale: Locale = settings?.locale ?? 'fr'
  const t = (k: Parameters<typeof translate>[1]): string => translate(locale, k)

  const toggleLocale = async (): Promise<void> => {
    setSettings(await window.api.invoke('settings:set', { locale: locale === 'fr' ? 'en' : 'fr' }))
  }

  return (
    <LocaleContext.Provider value={locale}>
      <div className="flex h-full">
        <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface">
          <div className="flex h-12 items-center px-4 font-semibold">{t('app.name')}</div>
          <div className="px-3">
            <button className="btn-primary w-full">{t('sidebar.newChat')}</button>
          </div>
          <div className="mt-4 px-4 panel-title">{t('sidebar.sessions')}</div>
          <div className="flex-1 px-4 py-2 text-sm text-muted">{t('sidebar.empty')}</div>
          <div className="border-t border-border p-3">
            <button className="btn-ghost w-full" onClick={() => void toggleLocale()}>
              {locale.toUpperCase()}
            </button>
          </div>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col bg-bg">
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <h1 className="text-2xl font-semibold">{t('chat.welcomeTitle')}</h1>
            <p className="max-w-md text-muted">{t('chat.welcomeBody')}</p>
          </div>
        </main>
        <section className="flex w-[34rem] shrink-0 flex-col border-l border-border bg-surface">
          <div className="flex h-12 items-center gap-4 border-b border-border px-4 panel-title">
            <span>{t('panel.files')}</span>
            <span>{t('panel.editor')}</span>
            <span>{t('panel.terminal')}</span>
          </div>
        </section>
      </div>
    </LocaleContext.Provider>
  )
}
