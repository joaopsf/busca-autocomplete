import { describe, expect, it } from 'vitest'
import municipios from '../dados/municipios.json'
import { indexar, pesquisar, type LinhaMunicipio } from './pesquisa'

const base = indexar(municipios as unknown as LinhaMunicipio[])
const nomes = (consulta: string, limite?: number) => pesquisar(base, consulta, limite).itens.map((c) => `${c.nome}/${c.uf}`)

describe('lista do IBGE', () => {
  it('tem todos os municípios, com código de 7 dígitos e UF', () => {
    expect(base.length).toBe(5571)
    expect(base.every((b) => String(b.cidade.id).length === 7 && /^[A-Z]{2}$/.test(b.cidade.uf))).toBe(true)
  })
})

describe('pesquisar', () => {
  it('"sao" acha "São ..." sem acento, com as capitais na frente', () => {
    const r = pesquisar(base, 'sao')
    expect(r.itens.length).toBe(8)
    expect(r.itens.every((c) => c.nome.startsWith('São'))).toBe(true)
    expect(r.total).toBeGreaterThan(300)
    expect(nomes('sao', 3)).toEqual(['São Luís/MA', 'São Paulo/SP', 'São Benedito/CE'])
  })

  it('as 27 capitais existem na lista com o nome exato', () => {
    expect(base.filter((b) => b.cidade.capital)).toHaveLength(27)
  })

  it('nome igual vem antes de quem começa igual, que vem antes de quem só contém', () => {
    expect(nomes('sao paulo', 3)).toEqual(['São Paulo/SP', 'São Paulo das Missões/RS', 'São Paulo de Olivença/AM'])
    const r = nomes('paulo', 50)
    // "Paulo Afonso" começa com a palavra; "São Paulo" tem a palavra no meio; "Paulópolis"... também começa.
    expect(r.indexOf('Paulo Afonso/BA')).toBeLessThan(r.indexOf('São Paulo/SP'))
  })

  it('acha pela palavra do meio e por pedaço de palavra', () => {
    expect(nomes('horizonte', 20)).toContain('Belo Horizonte/MG')
    expect(nomes('orizon', 20)).toContain('Belo Horizonte/MG')
  })

  it('filtra por estado com vírgula ou barra', () => {
    expect(nomes('santa maria, rs')).toEqual(['Santa Maria/RS', 'Santa Maria do Herval/RS'])
    expect(nomes('campo grande/ms')).toEqual(['Campo Grande/MS'])
  })

  it('consulta vazia não traz nada', () => {
    expect(pesquisar(base, '  ')).toEqual({ total: 0, itens: [] })
  })
})
