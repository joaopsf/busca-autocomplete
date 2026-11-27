export interface OpcoesCache {
  /** Quanto tempo, em ms, uma resposta continua valendo. */
  ttl: number
  /** Quantas consultas guardar no máximo. A menos usada recentemente sai primeiro. */
  maximo?: number
  /** Relógio injetável, pra testar validade sem esperar. */
  agora?: () => number
}

/**
 * Cache em memória com validade e limite de tamanho.
 * O Map mantém a ordem de inserção, então reinserir na leitura transforma ele num LRU simples.
 */
export class CacheTTL<V> {
  readonly ttl: number
  private readonly maximo: number
  private readonly agora: () => number
  private readonly itens = new Map<string, { valor: V; vence: number }>()

  constructor({ ttl, maximo = 100, agora = Date.now }: OpcoesCache) {
    this.ttl = ttl
    this.maximo = maximo
    this.agora = agora
  }

  ler(chave: string): V | undefined {
    const item = this.itens.get(chave)
    if (!item) return undefined
    if (item.vence <= this.agora()) {
      this.itens.delete(chave)
      return undefined
    }
    this.itens.delete(chave)
    this.itens.set(chave, item)
    return item.valor
  }

  gravar(chave: string, valor: V): void {
    this.itens.delete(chave)
    this.itens.set(chave, { valor, vence: this.agora() + this.ttl })
    while (this.itens.size > this.maximo) {
      const maisAntiga = this.itens.keys().next().value
      if (maisAntiga === undefined) break
      this.itens.delete(maisAntiga)
    }
  }

  limpar(): void {
    this.itens.clear()
  }

  get tamanho(): number {
    return this.itens.size
  }
}
