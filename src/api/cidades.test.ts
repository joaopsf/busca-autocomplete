import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { criarApiCidades, ErroApi, ErroSemConexao, latencia, type RespostaCidades } from './cidades'
import type { LinhaMunicipio } from './pesquisa'
import { SIMULACAO_PADRAO, type Simulacao } from './simulacao'

const LINHAS: LinhaMunicipio[] = [
  // Em ordem alfabética, como o JSON gerado.
  [3106200, 'Belo Horizonte', 'MG'],
  [1200401, 'Rio Branco', 'AC'],
  [3304557, 'Rio de Janeiro', 'RJ'],
  [3550308, 'São Paulo', 'SP'],
]

function api(sim: Partial<Simulacao> = {}, sorteio = 0) {
  return criarApiCidades({ simulacao: () => ({ ...SIMULACAO_PADRAO, ...sim }), sortear: () => sorteio, carregar: async () => LINHAS })
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('latência simulada', () => {
  it('normal fica entre 120 e 500 ms; lenta entre 1,2 e 2,5 s', () => {
    expect(latencia(SIMULACAO_PADRAO, 'x', 0)).toBe(120)
    expect(latencia(SIMULACAO_PADRAO, 'x', 1)).toBe(500)
    expect(latencia({ ...SIMULACAO_PADRAO, lenta: true }, 'x', 0)).toBe(1200)
    expect(latencia({ ...SIMULACAO_PADRAO, lenta: true }, 'x', 1)).toBe(2500)
  })

  it('fora de ordem: a consulta mais longa (a mais nova, de quem digita) volta antes', () => {
    const sim = { ...SIMULACAO_PADRAO, foraDeOrdem: true }
    expect(latencia(sim, 'rio', 0)).toBeGreaterThan(latencia(sim, 'rio branco', 0))
  })
})

describe('API de cidades', () => {
  it('responde no formato do contrato depois da latência', async () => {
    const resposta = vi.fn<(r: RespostaCidades) => void>()
    void api().buscar('rio').then(resposta)
    await vi.advanceTimersByTimeAsync(119)
    expect(resposta).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(resposta).toHaveBeenCalledWith({
      consulta: 'rio',
      total: 2,
      itens: [
        { id: 1200401, nome: 'Rio Branco', uf: 'AC', capital: true },
        { id: 3304557, nome: 'Rio de Janeiro', uf: 'RJ', capital: true },
      ],
    })
  })

  it('respeita o AbortSignal: para o relógio e rejeita com AbortError', async () => {
    const controle = new AbortController()
    const promessa = api().buscar('rio', controle.signal)
    controle.abort()
    await expect(promessa).rejects.toMatchObject({ name: 'AbortError' })
    expect(vi.getTimerCount()).toBe(0)
  })

  it('no modo fora de ordem ignora o cancelamento e responde mesmo assim', async () => {
    const controle = new AbortController()
    const promessa = api({ foraDeOrdem: true }).buscar('rio', controle.signal)
    controle.abort()
    await vi.advanceTimersByTimeAsync(3000)
    await expect(promessa).resolves.toMatchObject({ consulta: 'rio', total: 2 })
  })

  it('falhas "todas" responde 503; "algumas" falha quando o sorteio cai abaixo de 30%', async () => {
    const sempre = api({ falhas: 'todas' }).buscar('rio')
    const sorteada = api({ falhas: 'algumas' }, 0.29).buscar('rio')
    const passa = api({ falhas: 'algumas' }, 0.3).buscar('rio')
    void sempre.catch(() => {})
    void sorteada.catch(() => {})
    await vi.advanceTimersByTimeAsync(1000)
    await expect(sempre).rejects.toBeInstanceOf(ErroApi)
    await expect(sorteada).rejects.toMatchObject({ status: 503 })
    await expect(passa).resolves.toMatchObject({ total: 2 })
  })

  it('sem internet falha na hora, como o fetch', async () => {
    await expect(api({ semInternet: true }).buscar('rio')).rejects.toBeInstanceOf(ErroSemConexao)
  })
})
