import { useSyncExternalStore } from 'react'

export type Falhas = 'nenhuma' | 'algumas' | 'todas'

/** O que o painel "Simular" controla na API falsa. */
export interface Simulacao {
  /** Latência de 1,2s a 2,5s em vez de 120ms a 500ms. */
  lenta: boolean
  /** Respostas antigas demoram mais que as novas, e o servidor não para quando a requisição é cancelada. */
  foraDeOrdem: boolean
  /** "algumas" falha 30% das vezes; "todas" falha sempre. */
  falhas: Falhas
  /** A API responde como se a rede tivesse caído. */
  semInternet: boolean
}

export const SIMULACAO_PADRAO: Simulacao = { lenta: false, foraDeOrdem: false, falhas: 'nenhuma', semInternet: false }

let atual = SIMULACAO_PADRAO
const ouvintes = new Set<() => void>()

export function lerSimulacao(): Simulacao {
  return atual
}

export function ajustarSimulacao(mudanca: Partial<Simulacao>): void {
  atual = { ...atual, ...mudanca }
  ouvintes.forEach((o) => o())
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte)
  return () => ouvintes.delete(ouvinte)
}

export function useSimulacao(): Simulacao {
  return useSyncExternalStore(assinar, lerSimulacao)
}
