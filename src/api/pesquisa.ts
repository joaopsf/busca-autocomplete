import { limparConsulta, normalizar } from '../lib/texto'

/** Município do IBGE. */
export interface Cidade {
  /** Código IBGE de 7 dígitos. */
  id: number
  nome: string
  uf: string
  capital: boolean
}

// As 27 capitais sobem no empate: quem digita "sao" quase sempre quer São Paulo ou São Luís, não São Benedito.
// A lista do IBGE não traz população; capital é o desempate barato que resolve a maior parte dos casos.
export const CAPITAIS = new Set([
  'Rio Branco/AC',
  'Maceió/AL',
  'Macapá/AP',
  'Manaus/AM',
  'Salvador/BA',
  'Fortaleza/CE',
  'Brasília/DF',
  'Vitória/ES',
  'Goiânia/GO',
  'São Luís/MA',
  'Cuiabá/MT',
  'Campo Grande/MS',
  'Belo Horizonte/MG',
  'Belém/PA',
  'João Pessoa/PB',
  'Curitiba/PR',
  'Recife/PE',
  'Teresina/PI',
  'Rio de Janeiro/RJ',
  'Natal/RN',
  'Porto Alegre/RS',
  'Porto Velho/RO',
  'Boa Vista/RR',
  'Florianópolis/SC',
  'São Paulo/SP',
  'Aracaju/SE',
  'Palmas/TO',
])

/** Formato do JSON embutido: [código IBGE, nome, UF]. */
export type LinhaMunicipio = [number, string, string]

export interface CidadeIndexada {
  cidade: Cidade
  nome: string
  /** Começo de cada palavra no nome normalizado, pra achar "paulo" em "São Paulo". */
  palavras: number[]
}

export interface ResultadoPesquisa {
  total: number
  itens: Cidade[]
}

export function indexar(linhas: readonly LinhaMunicipio[]): CidadeIndexada[] {
  return linhas.map(([id, nome, uf]) => {
    const normal = normalizar(nome)
    const palavras = [0]
    for (let i = 1; i < normal.length; i++) if (normal[i - 1] === ' ') palavras.push(i)
    return { cidade: { id, nome, uf, capital: CAPITAIS.has(`${nome}/${uf}`) }, nome: normal, palavras }
  })
}

// Quanto menor, mais pra cima: nome igual, começa com, alguma palavra começa com, contém.
function pontuar(item: CidadeIndexada, alvo: string): number {
  const pos = item.nome.indexOf(alvo)
  if (pos < 0) return -1
  if (pos === 0) return item.nome.length === alvo.length ? 0 : 1
  return item.palavras.some((p) => item.nome.startsWith(alvo, p)) ? 2 : 3
}

/**
 * Busca no índice. Aceita filtrar por estado com vírgula ou barra: "santa maria, rs" ou "campo grande/ms".
 * Ordem: tipo de acerto, depois capital, depois alfabética (a base já vem em ordem e o sort é estável).
 */
export function pesquisar(base: readonly CidadeIndexada[], consulta: string, limite = 8): ResultadoPesquisa {
  let texto = limparConsulta(consulta)
  let uf: string | null = null
  const comUf = /^(.+?)\s*[,/]\s*([a-z]{2})$/i.exec(texto)
  if (comUf?.[1] && comUf[2]) {
    texto = comUf[1]
    uf = comUf[2].toUpperCase()
  }
  const alvo = normalizar(texto)
  if (!alvo) return { total: 0, itens: [] }

  const achados: { item: CidadeIndexada; pontos: number }[] = []
  for (const item of base) {
    if (uf && item.cidade.uf !== uf) continue
    const pontos = pontuar(item, alvo)
    if (pontos >= 0) achados.push({ item, pontos })
  }
  achados.sort((a, b) => a.pontos - b.pontos || Number(b.item.cidade.capital) - Number(a.item.cidade.capital))
  return { total: achados.length, itens: achados.slice(0, limite).map((a) => a.item.cidade) }
}
