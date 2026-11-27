import { describe, expect, it } from 'vitest'
import { limparConsulta, normalizar, partesDestacadas } from './texto'

describe('normalizar', () => {
  it('tira acento, cedilha e maiúscula', () => {
    expect(normalizar('São João del-Rei')).toBe('sao joao del rei')
    expect(normalizar('Embu-Guaçu')).toBe('embu guacu')
    expect(normalizar('Alta Floresta D’Oeste')).toBe('alta floresta doeste')
  })
})

describe('limparConsulta', () => {
  it('tira espaço das pontas e junta os repetidos', () => {
    expect(limparConsulta('  belo    horizonte ')).toBe('belo horizonte')
  })
})

describe('partesDestacadas', () => {
  it('"sao" destaca "São", com acento, no texto original', () => {
    expect(partesDestacadas('São Paulo', 'sao')).toEqual([
      { texto: 'São', bate: true },
      { texto: ' Paulo', bate: false },
    ])
  })

  it('destaca no meio e respeita o hífen', () => {
    expect(partesDestacadas('Embu-Guaçu', 'gua')).toEqual([
      { texto: 'Embu-', bate: false },
      { texto: 'Gua', bate: true },
      { texto: 'çu', bate: false },
    ])
    expect(partesDestacadas('Embu-Guaçu', 'embu guacu')).toEqual([{ texto: 'Embu-Guaçu', bate: true }])
  })

  it('apóstrofo no meio do trecho entra no destaque', () => {
    expect(partesDestacadas("Alta Floresta D'Oeste", 'doe')).toEqual([
      { texto: 'Alta Floresta ', bate: false },
      { texto: "D'Oe", bate: true },
      { texto: 'ste', bate: false },
    ])
  })

  it('sem bater ou sem consulta, devolve o texto inteiro sem destaque', () => {
    expect(partesDestacadas('Recife', 'xyz')).toEqual([{ texto: 'Recife', bate: false }])
    expect(partesDestacadas('Recife', '   ')).toEqual([{ texto: 'Recife', bate: false }])
  })
})
