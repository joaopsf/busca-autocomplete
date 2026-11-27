import { describe, expect, it } from 'vitest'
import { MAXIMO_LINHAS, registrar, type Linha } from './registro'

describe('linha do tempo das requisições', () => {
  it('início entra em cima como pendente e o fim atualiza a mesma linha', () => {
    let linhas: Linha[] = []
    linhas = registrar(linhas, { tipo: 'inicio', id: 1, consulta: 'rio' }, 1)
    linhas = registrar(linhas, { tipo: 'inicio', id: 2, consulta: 'rio b' }, 2)
    linhas = registrar(linhas, { tipo: 'fim', id: 1, consulta: 'rio', resultado: 'descartada', ms: 2200 }, 3)
    expect(linhas.map((l) => `${l.consulta}:${l.situacao}`)).toEqual(['rio b:pendente', 'rio:descartada'])
    expect(linhas[1]?.ms).toBe(2200)
  })

  it('guarda só as últimas e o cache entra como linha própria', () => {
    let linhas: Linha[] = []
    for (let i = 1; i <= MAXIMO_LINHAS + 3; i++) linhas = registrar(linhas, { tipo: 'inicio', id: i, consulta: `q${i}` }, i)
    linhas = registrar(linhas, { tipo: 'cache', consulta: 'q1' }, 99)
    expect(linhas).toHaveLength(MAXIMO_LINHAS)
    expect(linhas[0]).toMatchObject({ situacao: 'cache', consulta: 'q1', id: null })
  })
})
