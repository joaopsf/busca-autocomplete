// Gera src/dados/municipios.json a partir da API de localidades do IBGE.
// Uso: node scripts/gerar-municipios.mjs [arquivo-baixado.json]
// Sem argumento, baixa de https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado
import { readFile, writeFile } from 'node:fs/promises'

const FONTE = 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado'
const entrada = process.argv[2]
const bruto = entrada ? JSON.parse(await readFile(entrada, 'utf8')) : await (await fetch(FONTE)).json()

// Formato compacto: [código IBGE, nome, UF]. Cabe em ~150 KB em vez de 2,3 MB.
const linhas = bruto
  .map((m) => [m['municipio-id'], m['municipio-nome'], m['UF-sigla']])
  .toSorted((a, b) => a[1].localeCompare(b[1], 'pt-BR') || a[2].localeCompare(b[2]))

await writeFile(new URL('../src/dados/municipios.json', import.meta.url), JSON.stringify(linhas) + '\n')
console.log(`${linhas.length} municípios gravados`)
