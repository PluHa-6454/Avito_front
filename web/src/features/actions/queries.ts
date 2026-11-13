import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  cancelAction,
  confirmAction,
  getAction,
  listActions,
} from '@/shared/api/endpoints'
import { isApiError } from '@/shared/api/errors'
import {
  ActionSchema,
  ConflictResponseSchema,
  type Action,
} from '@/shared/api/schemas'

export const actionKeys = {
  all: ['actions'] as const,
  detail: (actionId: string) => ['actions', actionId] as const,
}

export function useActions() {
  return useQuery({
    queryKey: actionKeys.all,
    queryFn: ({ signal }) => listActions(signal),
  })
}

export function useAction(actionId: string | null) {
  return useQuery({
    queryKey: actionKeys.detail(actionId ?? 'none'),
    queryFn: ({ signal }) => getAction(actionId as string, signal),
    enabled: Boolean(actionId),
  })
}

function updateActionCaches(queryClient: ReturnType<typeof useQueryClient>, action: Action) {
  queryClient.setQueryData(actionKeys.detail(action.id), action)
  queryClient.setQueryData<{ items: Action[] }>(actionKeys.all, (current) => {
    if (!current) {
      return current
    }

    const exists = current.items.some((item) => item.id === action.id)

    return {
      items: exists
        ? current.items.map((item) => (item.id === action.id ? action : item))
        : [action, ...current.items],
    }
  })
}

function invalidateAfterChange(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: actionKeys.all })
  void queryClient.invalidateQueries({ queryKey: ['onboarding'] })
}

type ConfirmVariables = {
  actionId: string
  idempotencyKey: string
}

async function confirmWithConflictFallback({
  actionId,
  idempotencyKey,
}: ConfirmVariables): Promise<Action> {
  try {
    const response = await confirmAction(actionId, idempotencyKey)
    return response.action
  } catch (error) {
    if (!isApiError(error) || error.status !== 409) {
      throw error
    }

    const conflict = ConflictResponseSchema.safeParse(error.details)

    if (conflict.success && conflict.data.action) {
      return ActionSchema.parse(conflict.data.action)
    }

    return getAction(actionId)
  }
}

export function useConfirmAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: confirmWithConflictFallback,
    onSuccess: (action) => {
      updateActionCaches(queryClient, action)
      invalidateAfterChange(queryClient)
    },
  })
}

export function useCancelAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (actionId: string) => (await cancelAction(actionId)).action,
    onSuccess: (action) => {
      updateActionCaches(queryClient, action)
      invalidateAfterChange(queryClient)
    },
  })
}
