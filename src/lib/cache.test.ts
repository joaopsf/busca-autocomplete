import { describe, expect, it } from 'vitest'
import { CacheTTL } from './cache'

function relogio(inicio = 0) {
  let agora = inicio
  return { agora: () => agora, andar: (ms: number) => (agora += ms) }
}

describe('CacheTTL', () => {
  it('devolve o valor enquanto vale e esquece depois do ttl', () => {
    const r = relogio()
    const cache = new CacheTTL<string>({ ttl: 1000, agora: r.agora })
    cache.gravar('sao', 'resposta')
    r.andar(999)
    expect(cache.ler('sao')).toBe('resposta')
    r.andar(1)
    expect(cache.ler('sao')).toBeUndefined()
    expect(cache.tamanho).toBe(0)
  })

  it('regravar renova a validade', () => {
    const r = relogio()
    const cache = new CacheTTL<number>({ ttl: 1000, agora: r.agora })
    cache.gravar('a', 1)
    r.andar(800)
    cache.gravar('a', 2)
    r.andar(800)
    expect(cache.ler('a')).toBe(2)
  })

  it('no limite, tira a consulta usada há mais tempo', () => {
    const cache = new CacheTTL<number>({ ttl: 60_000, maximo: 2 })
    cache.gravar('a', 1)
    cache.gravar('b', 2)
    cache.ler('a') // "a" foi usada agora; "b" vira a mais antiga
    cache.gravar('c', 3)
    expect(cache.ler('b')).toBeUndefined()
    expect(cache.ler('a')).toBe(1)
    expect(cache.ler('c')).toBe(3)
  })

  it('limpar esvazia tudo', () => {
    const cache = new CacheTTL<number>({ ttl: 1000 })
    cache.gravar('a', 1)
    cache.limpar()
    expect(cache.tamanho).toBe(0)
  })
})
