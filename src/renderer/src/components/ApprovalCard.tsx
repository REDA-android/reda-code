import type { ApprovalRequest } from '@shared/types'
import { useTranslation } from '../i18n'

interface ApprovalCardProps {
  request: ApprovalRequest
  onApprove: (id: string) => void
  onDeny: (id: string) => void
}

export function ApprovalCard({ request, onApprove, onDeny }: ApprovalCardProps): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <div className="my-3 rounded-lg border border-warning/40 bg-surface-2 p-4 shadow-md animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-warning" />
          <span className="font-semibold text-fg text-sm">{t('approval.title')}</span>
          <span className="rounded bg-surface-3 px-2 py-0.5 font-mono text-xs text-accent">
            {request.tool}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-danger text-xs px-3 py-1"
            onClick={() => onDeny(request.id)}
          >
            {t('approval.deny')}
          </button>
          <button
            className="btn-primary text-xs px-3 py-1 bg-success hover:bg-success/90"
            onClick={() => onApprove(request.id)}
          >
            {t('approval.approve')}
          </button>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded border border-border bg-bg p-3 font-mono text-xs text-fg">
        <pre className="whitespace-pre-wrap">{request.preview}</pre>
      </div>
    </div>
  )
}
