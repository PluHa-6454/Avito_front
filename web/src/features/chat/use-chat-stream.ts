import { useSyncExternalStore } from 'react'

import { streamManager, type StreamState } from './stream-manager'

function subscribe(onStoreChange: () => void) {
  return streamManager.subscribe(onStoreChange)
}

function getSnapshot(): StreamState {
  return streamManager.getState()
}

export function useChatStream(): StreamState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
