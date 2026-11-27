import { useSyncExternalStore } from 'react'

function assinar(aoMudar: () => void) {
  addEventListener('online', aoMudar)
  addEventListener('offline', aoMudar)
  return () => {
    removeEventListener('online', aoMudar)
    removeEventListener('offline', aoMudar)
  }
}

/** Se o navegador acha que tem rede. Não garante que a API responde, mas "false" é certeza de que não vai. */
export function useNavegadorOnline(): boolean {
  return useSyncExternalStore(
    assinar,
    () => navigator.onLine,
    () => true,
  )
}
