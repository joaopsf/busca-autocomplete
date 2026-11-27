import type { EventoBusca } from '../busca/useBusca'

export type SituacaoLinha = 'pendente' | 'ok' | 'erro' | 'cancelada' | 'descartada' | 'cache'

export interface Linha {
  chave: string
  id: number | null
  consulta: string
  situacao: SituacaoLinha
  ms: number
}

export const MAXIMO_LINHAS = 8

/** Junta os eventos do useBusca numa lista curta, a mais nova em cima. */
export function registrar(linhas: readonly Linha[], evento: EventoBusca, serial: number): Linha[] {
  switch (evento.tipo) {
    case 'inicio':
      return [{ chave: `r${evento.id}`, id: evento.id, consulta: evento.consulta, situacao: 'pendente' as const, ms: 0 }, ...linhas].slice(
        0,
        MAXIMO_LINHAS,
      )
    case 'cache':
      return [{ chave: `c${serial}`, id: null, consulta: evento.consulta, situacao: 'cache' as const, ms: 0 }, ...linhas].slice(
        0,
        MAXIMO_LINHAS,
      )
    case 'fim':
      // Se a linha já saiu da lista (muitas requisições), não tem o que atualizar.
      return linhas.map((l) => (l.id === evento.id ? { ...l, situacao: evento.resultado, ms: evento.ms } : l))
  }
}
