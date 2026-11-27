import { useCallback, useState } from 'react'

/** Põe o item no topo, sem repetir, e corta no máximo. Função pura pra testar sem React. */
export function adicionarRecente<T>(lista: readonly T[], item: T, chave: (item: T) => string | number, maximo: number): T[] {
  const k = chave(item)
  return [item, ...lista.filter((x) => chave(x) !== k)].slice(0, maximo)
}

function ler<T>(armazenamento: string): T[] {
  try {
    const bruto = localStorage.getItem(armazenamento)
    const lido: unknown = bruto ? JSON.parse(bruto) : []
    return Array.isArray(lido) ? (lido as T[]) : []
  } catch {
    // Aba anônima, cota cheia ou JSON quebrado: segue sem histórico em vez de quebrar a busca.
    return []
  }
}

function gravar<T>(armazenamento: string, lista: readonly T[]) {
  try {
    localStorage.setItem(armazenamento, JSON.stringify(lista))
  } catch {
    // Sem armazenamento, o histórico vale só enquanto a aba estiver aberta.
  }
}

/** Histórico de escolhas recentes guardado no aparelho. */
export function useRecentes<T>(armazenamento: string, chave: (item: T) => string | number, maximo = 5) {
  const [recentes, setRecentes] = useState<T[]>(() => ler<T>(armazenamento))

  const adicionar = useCallback(
    (item: T) =>
      setRecentes((atual) => {
        const nova = adicionarRecente(atual, item, chave, maximo)
        gravar(armazenamento, nova)
        return nova
      }),
    [armazenamento, chave, maximo],
  )

  const limpar = useCallback(() => {
    gravar(armazenamento, [])
    setRecentes([])
  }, [armazenamento])

  return { recentes, adicionar, limpar }
}
