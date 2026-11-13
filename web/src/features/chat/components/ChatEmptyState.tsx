import { Bot, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'

const QUICK_PROMPTS = [
  'Как у нас устроено код-ревью?',
  'Какие доступы мне нужны?',
  'Какую задачу взять первой?',
  'Как оформить отгул?',
] as const

type ChatEmptyStateProps = {
  onPrompt: (prompt: string) => void
  disabled?: boolean
}

export function ChatEmptyState({ onPrompt, disabled }: ChatEmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-10 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Bot className="size-7" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-foreground">Спросите AI-buddy</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Наставник отвечает по базе знаний вашей команды. Если точного ответа нет — предложит
        обратиться к наставнику.
      </p>
      <div className="mt-6 flex max-w-xl flex-wrap justify-center gap-2">
        {QUICK_PROMPTS.map((prompt) => (
          <Button
            key={prompt}
            type="button"
            variant="outline"
            size="sm"
            className="h-auto whitespace-normal py-2 text-left"
            disabled={disabled}
            onClick={() => onPrompt(prompt)}
          >
            <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  )
}
