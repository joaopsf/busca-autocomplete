import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CacheTTL } from '../lib/cache'
import { useBusca, type EventoBusca, type OpcoesBusca } from './useBusca'

/** Promessa que o teste resolve quando quiser, pra controlar a ordem de chegada. */
function adiada<T>() {
  let resolver!: (v: T) => void
  let rejeitar!: (e: unknown) => void
  const promessa = new Promise<T>((res, rej) => {
    resolver = res
    rejeitar = rej
  })
  return { promessa, resolver, rejeitar }
}

/** Servidor falso: cada chamada fica pendurada até o teste responder. Por padrão ignora o abort. */
function servidor({ respeitaAbort = false } = {}) {
  const chamadas: { consulta: string; signal: AbortSignal; responder: (v: string[]) => void; falhar: (e: unknown) => void }[] = []
  const buscar = vi.fn<(consulta: string, signal: AbortSignal) => Promise<string[]>>((consulta, signal) => {
    const a = adiada<string[]>()
    if (respeitaAbort) signal.addEventListener('abort', () => a.rejeitar(new DOMException('cancelada', 'AbortError')))
    chamadas.push({ consulta, signal, responder: a.resolver, falhar: a.rejeitar })
    return a.promessa
  })
  return { buscar, chamadas }
}

function montar(opcoes: OpcoesBusca<string[]>, consulta = '') {
  return renderHook(({ q, o }) => useBusca(q, o), { initialProps: { q: consulta, o: opcoes } })
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useBusca: debounce', () => {
  it('só busca depois de `atraso` ms sem digitar, e só a última consulta', () => {
    const { buscar } = servidor()
    const { rerender, result } = montar({ buscar, atraso: 300 })

    for (const q of ['b', 'be', 'bel', 'belo']) {
      rerender({ q, o: { buscar, atraso: 300 } })
      act(() => vi.advanceTimersByTime(100))
    }
    expect(buscar).not.toHaveBeenCalled()
    expect(result.current.situacao).toBe('carregando')

    act(() => vi.advanceTimersByTime(199))
    expect(buscar).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(buscar).toHaveBeenCalledTimes(1)
    expect(buscar).toHaveBeenCalledWith('belo', expect.any(AbortSignal))
  })

  it('menos letras que o mínimo não busca e fica ocioso', () => {
    const { buscar } = servidor()
    const { result } = montar({ buscar, minimo: 2 }, 'b')
    act(() => vi.advanceTimersByTime(1000))
    expect(buscar).not.toHaveBeenCalled()
    expect(result.current.situacao).toBe('ocioso')
  })

  it('espaços nas pontas não viram outra busca', async () => {
    const { buscar, chamadas } = servidor()
    const o = { buscar }
    const { rerender } = montar(o, 'rio')
    act(() => vi.advanceTimersByTime(300))
    await act(async () => chamadas[0]?.responder(['Rio Branco']))
    rerender({ q: ' rio  ', o })
    act(() => vi.advanceTimersByTime(300))
    expect(buscar).toHaveBeenCalledTimes(1)
  })
})

describe('useBusca: cancelamento e ordem', () => {
  it('consulta nova aborta a requisição anterior na hora', () => {
    const { buscar, chamadas } = servidor({ respeitaAbort: true })
    const o = { buscar }
    const { rerender } = montar(o, 'ri')
    act(() => vi.advanceTimersByTime(300))
    expect(chamadas[0]?.signal.aborted).toBe(false)

    rerender({ q: 'rio', o })
    expect(chamadas[0]?.signal.aborted).toBe(true)
  })

  it('resposta antiga que chega DEPOIS da nova é descartada (servidor que ignora o abort)', async () => {
    const eventos: EventoBusca[] = []
    const { buscar, chamadas } = servidor()
    const o = { buscar, aoEvento: (e: EventoBusca) => eventos.push(e) }
    const { rerender, result } = montar(o, 'rio')
    act(() => vi.advanceTimersByTime(300))
    rerender({ q: 'rio branco', o })
    act(() => vi.advanceTimersByTime(300))
    expect(chamadas.map((c) => c.consulta)).toEqual(['rio', 'rio branco'])

    // A nova chega primeiro...
    await act(async () => chamadas[1]?.responder(['Rio Branco']))
    expect(result.current.dados).toEqual(['Rio Branco'])
    // ...e a velha chega depois, com outra lista. Não pode sobrescrever.
    await act(async () => chamadas[0]?.responder(['Rio Branco', 'Rio de Janeiro', 'Rio Claro']))
    expect(result.current.dados).toEqual(['Rio Branco'])
    expect(result.current.consulta).toBe('rio branco')
    expect(eventos.filter((e) => e.tipo === 'fim').map((e) => e.tipo === 'fim' && `${e.consulta}:${e.resultado}`)).toEqual([
      'rio branco:ok',
      'rio:descartada',
    ])
  })

  it('resposta antiga que chega ANTES da nova também é descartada', async () => {
    const { buscar, chamadas } = servidor()
    const o = { buscar }
    const { rerender, result } = montar(o, 'rio')
    act(() => vi.advanceTimersByTime(300))
    rerender({ q: 'rio branco', o })
    await act(async () => chamadas[0]?.responder(['Rio de Janeiro']))
    expect(result.current.dados).toBeNull()
    expect(result.current.situacao).toBe('carregando')

    act(() => vi.advanceTimersByTime(300))
    await act(async () => chamadas[1]?.responder(['Rio Branco']))
    expect(result.current).toMatchObject({ situacao: 'sucesso', dados: ['Rio Branco'], consulta: 'rio branco' })
  })

  it('erro de requisição velha não vira erro na tela', async () => {
    const { buscar, chamadas } = servidor()
    const o = { buscar }
    const { rerender, result } = montar(o, 'rio')
    act(() => vi.advanceTimersByTime(300))
    rerender({ q: 'rio branco', o })
    await act(async () => chamadas[0]?.falhar(new Error('503')))
    expect(result.current.situacao).toBe('carregando')
  })

  it('desmontar no meio da busca cancela e não mexe em estado', async () => {
    const { buscar, chamadas } = servidor({ respeitaAbort: true })
    const { unmount } = montar({ buscar }, 'rio')
    act(() => vi.advanceTimersByTime(300))
    unmount()
    expect(chamadas[0]?.signal.aborted).toBe(true)
  })

  it('enquanto a próxima carrega, mantém a última lista boa (sem piscar)', async () => {
    const { buscar, chamadas } = servidor()
    const o = { buscar }
    const { rerender, result } = montar(o, 'rio')
    act(() => vi.advanceTimersByTime(300))
    await act(async () => chamadas[0]?.responder(['Rio Branco', 'Rio de Janeiro']))
    rerender({ q: 'rio b', o })
    expect(result.current).toMatchObject({ situacao: 'carregando', dados: ['Rio Branco', 'Rio de Janeiro'], consulta: 'rio' })
  })
})

describe('useBusca: cache', () => {
  it('a mesma consulta dentro da validade não vai pra rede e volta na hora', async () => {
    const cache = new CacheTTL<string[]>({ ttl: 10_000 })
    const { buscar, chamadas } = servidor()
    const o = { buscar, cache }
    const { rerender, result } = montar(o, 'rio')
    act(() => vi.advanceTimersByTime(300))
    await act(async () => chamadas[0]?.responder(['Rio Branco']))

    rerender({ q: 'recife', o })
    rerender({ q: 'RIO', o })
    // Sem esperar debounce nenhum.
    expect(result.current).toMatchObject({ situacao: 'sucesso', dados: ['Rio Branco'], doCache: true })
    act(() => vi.advanceTimersByTime(1000))
    expect(buscar).toHaveBeenCalledTimes(1)
  })

  it('depois da validade, busca de novo', async () => {
    const cache = new CacheTTL<string[]>({ ttl: 10_000 })
    const { buscar, chamadas } = servidor()
    const o = { buscar, cache }
    const { rerender } = montar(o, 'rio')
    act(() => vi.advanceTimersByTime(300))
    await act(async () => chamadas[0]?.responder(['Rio Branco']))
    rerender({ q: 'recife', o })
    act(() => vi.advanceTimersByTime(10_000))
    rerender({ q: 'rio', o })
    act(() => vi.advanceTimersByTime(300))
    expect(buscar).toHaveBeenCalledTimes(3)
    expect(buscar).toHaveBeenLastCalledWith('rio', expect.any(AbortSignal))
  })

  it('erro não vai pro cache', async () => {
    const cache = new CacheTTL<string[]>({ ttl: 10_000 })
    const { buscar, chamadas } = servidor()
    montar({ buscar, cache }, 'rio')
    act(() => vi.advanceTimersByTime(300))
    await act(async () => chamadas[0]?.falhar(new Error('503')))
    expect(cache.tamanho).toBe(0)
  })

  it('chaveDoCache deixa "sao" e "São" serem a mesma consulta', async () => {
    const cache = new CacheTTL<string[]>({ ttl: 10_000 })
    const { buscar, chamadas } = servidor()
    const o = { buscar, cache, chaveDoCache: (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase() }
    const { rerender, result } = montar(o, 'sao')
    act(() => vi.advanceTimersByTime(300))
    await act(async () => chamadas[0]?.responder(['São Paulo']))
    rerender({ q: 'São', o })
    expect(result.current.doCache).toBe(true)
    expect(buscar).toHaveBeenCalledTimes(1)
  })
})

describe('useBusca: vazio, erro e offline', () => {
  it('resposta vazia vira "vazio"', async () => {
    const { buscar, chamadas } = servidor()
    const { result } = montar({ buscar }, 'xyz')
    act(() => vi.advanceTimersByTime(300))
    await act(async () => chamadas[0]?.responder([]))
    expect(result.current.situacao).toBe('vazio')
  })

  it('erro mostra "erro" e "tentar de novo" busca na hora, sem debounce', async () => {
    const { buscar, chamadas } = servidor()
    const { result } = montar({ buscar }, 'rio')
    act(() => vi.advanceTimersByTime(300))
    await act(async () => chamadas[0]?.falhar(new Error('503')))
    expect(result.current.situacao).toBe('erro')

    act(() => result.current.tentarDeNovo())
    expect(result.current.situacao).toBe('carregando')
    act(() => vi.advanceTimersByTime(0))
    expect(buscar).toHaveBeenCalledTimes(2)
    await act(async () => chamadas[1]?.responder(['Rio Branco']))
    expect(result.current.situacao).toBe('sucesso')
  })

  it('offline não tenta, mas o cache vale; quando a rede volta, busca sozinho', async () => {
    const cache = new CacheTTL<string[]>({ ttl: 60_000 })
    cache.gravar('rio', ['Rio Branco'])
    const { buscar, chamadas } = servidor()
    const { rerender, result } = montar({ buscar, cache, online: false }, 'rio')
    expect(result.current).toMatchObject({ situacao: 'sucesso', doCache: true })

    rerender({ q: 'recife', o: { buscar, cache, online: false } })
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.situacao).toBe('offline')
    expect(buscar).not.toHaveBeenCalled()

    rerender({ q: 'recife', o: { buscar, cache, online: true } })
    act(() => vi.advanceTimersByTime(300))
    await act(async () => chamadas[0]?.responder(['Recife']))
    expect(result.current).toMatchObject({ situacao: 'sucesso', dados: ['Recife'] })
  })

  it('a rede cair no meio da busca cancela a requisição', () => {
    const { buscar, chamadas } = servidor({ respeitaAbort: true })
    const { rerender, result } = montar({ buscar, online: true }, 'rio')
    act(() => vi.advanceTimersByTime(300))
    rerender({ q: 'rio', o: { buscar, online: false } })
    expect(chamadas[0]?.signal.aborted).toBe(true)
    expect(result.current.situacao).toBe('offline')
  })
})
