import css from './LinhaDoTempo.module.css'
import type { Linha, SituacaoLinha } from './registro'

const TEXTO: Record<SituacaoLinha, string> = {
  pendente: 'esperando',
  ok: 'usada',
  erro: 'erro',
  cancelada: 'cancelada',
  descartada: 'chegou atrasada, descartada',
  cache: 'do cache',
}

// Escala das barras: 2,5s ocupa a largura toda.
const ESCALA_MS = 2500

/** Cada requisição que o useBusca fez, pra ver debounce, cancelamento e ordem acontecendo. */
export function LinhaDoTempo({ linhas }: { linhas: readonly Linha[] }) {
  return (
    <section className={`placa ${css.caixa}`} aria-labelledby="tempo-titulo">
      <h2 id="tempo-titulo">Requisições</h2>
      <p className={css.explica}>A mais nova fica em cima. Só a última resposta chega na tela.</p>
      {linhas.length === 0 ? (
        <p className={css.vazio}>Digite na busca pra ver as requisições aqui.</p>
      ) : (
        <ol className={css.lista}>
          {linhas.map((l) => (
            <li key={l.chave} className={css.linha} data-situacao={l.situacao}>
              <span className={css.numero}>{l.id === null ? '·' : `#${l.id}`}</span>
              <span className={css.consulta}>“{l.consulta}”</span>
              <span className={css.trilho} aria-hidden="true">
                <span
                  className={css.barra}
                  style={{ width: l.situacao === 'pendente' ? undefined : `${Math.min(100, (l.ms / ESCALA_MS) * 100)}%` }}
                />
              </span>
              <span className={css.fim}>
                <span className={css.selo}>{TEXTO[l.situacao]}</span>
                {l.situacao !== 'pendente' && l.situacao !== 'cache' && <span className={css.ms}>{l.ms} ms</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
