import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { Action } from '@/shared/api/schemas'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { SyntheticBadge } from '@/shared/components/SyntheticBadge'
import { formatDate, formatTime } from '@/shared/lib/format'

import { ACTION_TYPE_LABELS, getFieldRows, getResultRows } from '../labels'

type ActionDetailsSheetProps = {
  action: Action | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ActionDetailsSheet({ action, open, onOpenChange }: ActionDetailsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md">
        {action ? (
          <>
            <SheetHeader className="border-b">
              <div className="flex items-center gap-2">
                <SheetTitle>{ACTION_TYPE_LABELS[action.type]}</SheetTitle>
                <SyntheticBadge />
              </div>
              <SheetDescription className="flex flex-wrap items-center gap-2">
                <StatusBadge status={action.status} />
                <span>
                  Создано {formatDate(action.created_at)} в {formatTime(action.created_at)}
                </span>
              </SheetDescription>
            </SheetHeader>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
              <section aria-label="Параметры действия">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Параметры
                </h3>
                <dl className="mt-2 grid gap-2">
                  {getFieldRows(action.type, action.fields).map((row) => (
                    <div key={row.label} className="flex justify-between gap-3">
                      <dt className="text-xs text-muted-foreground">{row.label}</dt>
                      <dd className="max-w-[60%] break-words text-right text-xs font-medium text-foreground">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>

              {action.result ? (
                <section aria-label="Результат действия">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Результат
                  </h3>
                  <dl className="mt-2 grid gap-2 rounded-xl border border-success/30 bg-success/5 p-3">
                    {getResultRows(action.result).map((row) => (
                      <div key={row.label} className="flex justify-between gap-3">
                        <dt className="text-xs text-muted-foreground">{row.label}</dt>
                        <dd className="text-xs font-medium text-foreground">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}

              {action.error ? (
                <section aria-label="Ошибка действия">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Ошибка
                  </h3>
                  <p
                    role="alert"
                    className="mt-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
                  >
                    {action.error.message}
                  </p>
                </section>
              ) : null}

              <section aria-label="История статусов">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  История
                </h3>
                <ol className="mt-2 space-y-2">
                  {action.history.map((event, index) => (
                    <li key={`${event.status}-${event.at}-${index}`} className="flex gap-2.5">
                      <span
                        className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={event.status} className="text-[10px]" />
                          <span className="text-[11px] text-muted-foreground">
                            {formatDate(event.at)} в {formatTime(event.at)}
                          </span>
                        </div>
                        {event.note ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">{event.note}</p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
