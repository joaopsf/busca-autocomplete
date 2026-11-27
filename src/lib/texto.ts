// Comparação de texto que ignora acento, maiúscula e pontuação de nome de cidade.
// "sao" acha "São", "embu guacu" acha "Embu-Guaçu", "doeste" acha "D'Oeste".

const MARCAS = /\p{M}/gu
const APOSTROFOS = /['’`´]/g

/** Normaliza um caractere. Pode devolver string vazia (apóstrofo) ou mais de um caractere. */
function normalizarCaractere(c: string): string {
  if (c === '-') return ' '
  return c.normalize('NFD').replace(MARCAS, '').replace(APOSTROFOS, '').toLowerCase()
}

/** Texto pronto pra comparar: sem acento, minúsculo, hífen vira espaço, sem apóstrofo. */
export function normalizar(texto: string): string {
  let saida = ''
  for (const c of texto) saida += normalizarCaractere(c)
  return saida
}

/** Limpa o que a pessoa digitou: tira espaço das pontas e junta espaços repetidos. */
export function limparConsulta(consulta: string): string {
  return consulta.trim().replace(/\s+/g, ' ')
}

export interface Parte {
  texto: string
  bate: boolean
}

/**
 * Quebra o texto original em partes, marcando o trecho que bate com a consulta.
 * A busca é feita no texto normalizado, mas o recorte é feito no original,
 * então o destaque mostra "São" com acento, e não "sao".
 */
export function partesDestacadas(texto: string, consulta: string): Parte[] {
  const alvo = normalizar(limparConsulta(consulta))
  if (!alvo) return [{ texto, bate: false }]

  // Monta o texto normalizado guardando, pra cada posição dele, de onde veio no original.
  const caracteres = Array.from(texto)
  let normal = ''
  const origem: number[] = []
  caracteres.forEach((c, i) => {
    const n = normalizarCaractere(c)
    normal += n
    for (let k = 0; k < n.length; k++) origem.push(i)
  })

  const inicio = normal.indexOf(alvo)
  if (inicio < 0) return [{ texto, bate: false }]

  const de = origem[inicio] ?? 0
  const ate = (origem[inicio + alvo.length - 1] ?? de) + 1
  const partes: Parte[] = []
  if (de > 0) partes.push({ texto: caracteres.slice(0, de).join(''), bate: false })
  partes.push({ texto: caracteres.slice(de, ate).join(''), bate: true })
  if (ate < caracteres.length) partes.push({ texto: caracteres.slice(ate).join(''), bate: false })
  return partes
}
