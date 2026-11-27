import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CacheTTL } from '../lib/cache'
import { limparConsulta } from '../lib/texto'

export type Situacao = 'ocioso' | 'carregando' | 'sucesso' | 'vazio' | 'erro' | 'offline'

/** O que aconteceu com cada busca. Serve pra log, métrica ou, aqui, a linha do tempo da tela. */
export type EventoBusca =
  | { tipo: 'inicio'; id: number; consulta: string }
  | { tipo: 'fim'; id: number; consulta: string; resultado: 'ok' | 'erro' | 'cancelada' | 'descartada'; ms: number }
  | { tipo: 'cache'; consulta: string }

export interface OpcoesBusca<R> {
  /** Faz a busca. Tem que repassar o signal pro fetch (ou equivalente) pra cancelar de verdade. */
  buscar: (consulta: string, signal: AbortSignal) => Promise<R>
  /** Espera, em ms, depois da última tecla. Padrão 300. */
  atraso?: number
  /** Menos letras que isso não busca. Padrão 2. */
  minimo?: number
  /** Cache compartilhável entre telas. Sem ele, toda consulta vai pra rede. */
  cache?: CacheTTL<R>
  /** Como a consulta vira chave do cache. Padrão: minúscula. Se a API ignora acento, normalize aqui também. */
  chaveDoCache?: (termo: string) => string
  /** Sem conexão não tenta: mostra "offline" (o cache continua valendo) e volta sozinho quando a rede volta. */
  online?: boolean
  /** Diz se a resposta veio vazia. Padrão: array vazio ou objeto com `itens` vazio. */
  estaVazio?: (resposta: R) => boolean
  aoEvento?: (evento: EventoBusca) => void
}

export interface EstadoBusca<R> {
  situacao: Situacao
  /** Última resposta boa. Continua aqui enquanto a próxima carrega, pra lista não piscar. */
  dados: R | null
  /** A consulta a que `dados` responde (pode ser diferente do que está digitado agora). */
  consulta: string
  doCache: boolean
  erro: unknown
}

export interface ResultadoBusca<R> extends EstadoBusca<R> {
  tentarDeNovo: () => void
}

/** A última busca que terminou (bem ou mal). É o único estado guardado: o resto é derivado no render. */
interface Assentada<R> {
  termo: string
  tentativa: number
  ok: boolean
  dados: R | null
  erro: unknown
}

function vazioPadrao(resposta: unknown): boolean {
  if (Array.isArray(resposta)) return resposta.length === 0
  if (resposta && typeof resposta === 'object' && 'itens' in resposta && Array.isArray(resposta.itens)) return resposta.itens.length === 0
  return resposta == null
}

const minuscula = (termo: string) => termo.toLocaleLowerCase('pt-BR')

/**
 * Busca enquanto a pessoa digita, sem race condition.
 *
 * - Espera `atraso` ms de silêncio antes de buscar (debounce).
 * - Cada consulta nova cancela a anterior com AbortController.
 * - Resposta de requisição cancelada é descartada mesmo que o servidor ignore o cancelamento:
 *   a guarda é o `signal.aborted` do lado do cliente, não a boa vontade do servidor.
 * - Resposta boa vai pro cache (se tiver), e a mesma consulta volta na hora, sem debounce.
 */
export function useBusca<R>(consulta: string, opcoes: OpcoesBusca<R>): ResultadoBusca<R> {
  const { atraso = 300, minimo = 2, online = true, cache, chaveDoCache = minuscula, estaVazio = vazioPadrao } = opcoes
  const termo = limparConsulta(consulta)
  const [tentativa, setTentativa] = useState(0)
  const [assentada, setAssentada] = useState<Assentada<R> | null>(null)
  // Última resposta boa, pra mostrar (apagada) enquanto a próxima carrega.
  const [ultimaBoa, setUltimaBoa] = useState<{ termo: string; dados: R } | null>(null)
  const pularAtraso = useRef(false)
  const sequencia = useRef(0)

  // Funções vêm novas a cada render. Guardar a última numa ref evita refazer a busca à toa.
  const ultimas = useRef(opcoes)
  useLayoutEffect(() => {
    ultimas.current = opcoes
  })

  const curta = termo.length < minimo
  const resolvida = assentada !== null && assentada.termo === termo && assentada.tentativa === tentativa
  const guardado = curta || resolvida ? undefined : cache?.ler(chaveDoCache(termo))
  const precisaBuscar = !curta && !resolvida && guardado === undefined && online

  useEffect(() => {
    const { buscar, aoEvento } = ultimas.current
    const memoria = ultimas.current.cache
    const chave = (ultimas.current.chaveDoCache ?? minuscula)(termo)
    if (curta) return
    if (!precisaBuscar) {
      if (!resolvida && memoria?.ler(chave) !== undefined) aoEvento?.({ tipo: 'cache', consulta: termo })
      return
    }

    const controle = new AbortController()
    const espera = pularAtraso.current ? 0 : atraso
    pularAtraso.current = false

    const relogio = setTimeout(() => {
      const id = ++sequencia.current
      const inicio = performance.now()
      const fim = (resultado: 'ok' | 'erro' | 'cancelada' | 'descartada') =>
        aoEvento?.({ tipo: 'fim', id, consulta: termo, resultado, ms: Math.round(performance.now() - inicio) })
      aoEvento?.({ tipo: 'inicio', id, consulta: termo })
      // Saiu requisição nova: a última assentada deixa de ser "a resposta atual" de qualquer consulta.
      // Sem isso, voltar pra consulta anterior depois do ttl mostraria a resposta velha sem buscar.
      setAssentada(null)

      buscar(termo, controle.signal).then(
        (dados) => {
          // Chegou depois de cancelada: o servidor não respeitou o abort. Joga fora.
          if (controle.signal.aborted) return fim('descartada')
          memoria?.gravar(chave, dados)
          setAssentada({ termo, tentativa, ok: true, dados, erro: null })
          setUltimaBoa({ termo, dados })
          fim('ok')
        },
        (erro: unknown) => {
          if (controle.signal.aborted) return fim(erro instanceof DOMException && erro.name === 'AbortError' ? 'cancelada' : 'descartada')
          setAssentada({ termo, tentativa, ok: false, dados: null, erro })
          fim('erro')
        },
      )
    }, espera)

    // Roda quando a consulta muda, o componente sai ou a rede cai: a busca em andamento perde o sentido.
    return () => {
      clearTimeout(relogio)
      controle.abort()
    }
  }, [termo, curta, resolvida, precisaBuscar, atraso, tentativa])

  const tentarDeNovo = useCallback(() => {
    pularAtraso.current = true
    setTentativa((t) => t + 1)
  }, [])

  let estado: EstadoBusca<R>
  if (curta) {
    estado = { situacao: 'ocioso', dados: null, consulta: '', doCache: false, erro: null }
  } else if (resolvida) {
    estado = assentada.ok
      ? {
          situacao: estaVazio(assentada.dados as R) ? 'vazio' : 'sucesso',
          dados: assentada.dados,
          consulta: termo,
          doCache: false,
          erro: null,
        }
      : { situacao: 'erro', dados: null, consulta: termo, doCache: false, erro: assentada.erro }
  } else if (guardado !== undefined) {
    estado = { situacao: estaVazio(guardado) ? 'vazio' : 'sucesso', dados: guardado, consulta: termo, doCache: true, erro: null }
  } else if (!online) {
    estado = { situacao: 'offline', dados: null, consulta: termo, doCache: false, erro: null }
  } else {
    estado = { situacao: 'carregando', dados: ultimaBoa?.dados ?? null, consulta: ultimaBoa?.termo ?? '', doCache: false, erro: null }
  }

  return { ...estado, tentarDeNovo }
}
