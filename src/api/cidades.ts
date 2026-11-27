import { indexar, pesquisar, type Cidade, type CidadeIndexada, type LinhaMunicipio } from './pesquisa'
import { lerSimulacao, type Simulacao } from './simulacao'

/** Contrato da API: o mesmo que um GET /cidades?q=... devolveria. */
export interface RespostaCidades {
  consulta: string
  total: number
  itens: Cidade[]
}

/** O servidor respondeu com erro (5xx). Dá pra tentar de novo. */
export class ErroApi extends Error {
  readonly status: number
  constructor(status: number) {
    super(`O servidor respondeu ${status}`)
    this.name = 'ErroApi'
    this.status = status
  }
}

/** A requisição nem saiu: sem rede. É o que o fetch faz (TypeError) quando a conexão cai. */
export class ErroSemConexao extends TypeError {
  constructor() {
    super('Failed to fetch')
    this.name = 'ErroSemConexao'
  }
}

function erroCancelada(): DOMException {
  return new DOMException('A requisição foi cancelada', 'AbortError')
}

export interface OpcoesApi {
  simulacao?: () => Simulacao
  /** Sorteio entre 0 e 1. Injetável pra latência e falha previsíveis nos testes. */
  sortear?: () => number
  carregar?: () => Promise<readonly LinhaMunicipio[]>
  limite?: number
}

// A lista do IBGE vira um pedaço separado do build: só baixa quando a primeira busca acontece.
const carregarMunicipios = () => import('../dados/municipios.json').then((m) => m.default as unknown as LinhaMunicipio[])

/** Quanto a resposta vai demorar. Exportado pra ser testado sozinho. */
export function latencia(sim: Simulacao, consulta: string, sorteio: number): number {
  // Fora de ordem: consulta curta demora mais (como se trouxesse mais dados).
  // Quem digita "rio" e depois "rio branco" recebe a resposta de "rio branco" primeiro.
  if (sim.foraDeOrdem) return Math.max(300, 3200 - 320 * consulta.length)
  if (sim.lenta) return 1200 + Math.round(sorteio * 1300)
  return 120 + Math.round(sorteio * 380)
}

/**
 * API de cidades simulada no navegador. Não tem back-end (o app roda no GitHub Pages),
 * mas se comporta como uma API de verdade: latência, falha, queda de rede e AbortSignal.
 */
export function criarApiCidades({
  simulacao = lerSimulacao,
  sortear = Math.random,
  carregar = carregarMunicipios,
  limite = 8,
}: OpcoesApi = {}) {
  let indice: Promise<CidadeIndexada[]> | null = null

  function buscar(consulta: string, signal?: AbortSignal): Promise<RespostaCidades> {
    const sim = simulacao()
    if (signal?.aborted) return Promise.reject(erroCancelada())
    if (sim.semInternet) return Promise.reject(new ErroSemConexao())

    indice ??= carregar().then(indexar)
    const base = indice
    const espera = latencia(sim, consulta, sortear())
    const falhar = sim.falhas === 'todas' || (sim.falhas === 'algumas' && sortear() < 0.3)

    return new Promise<RespostaCidades>((resolver, rejeitar) => {
      const relogio = setTimeout(() => {
        signal?.removeEventListener('abort', aoCancelar)
        if (falhar) return rejeitar(new ErroApi(503))
        base.then((b) => resolver({ consulta, ...pesquisar(b, consulta, limite) }), rejeitar)
      }, espera)

      function aoCancelar() {
        clearTimeout(relogio)
        rejeitar(erroCancelada())
      }
      // No modo "fora de ordem" o servidor finge que a resposta já estava a caminho:
      // ignora o cancelamento e responde mesmo assim. Quem tem que se proteger é o cliente.
      if (!sim.foraDeOrdem) signal?.addEventListener('abort', aoCancelar, { once: true })
    })
  }

  return { buscar }
}

export const apiCidades = criarApiCidades()
