import { ajustarSimulacao, useSimulacao, type Falhas } from '../api/simulacao'
import { Icone } from './Icone'
import css from './PainelSimular.module.css'

const OPCOES_FALHA: { valor: Falhas; texto: string }[] = [
  { valor: 'nenhuma', texto: 'Nenhuma' },
  { valor: 'algumas', texto: '30%' },
  { valor: 'todas', texto: 'Todas' },
]

const OPCOES_CACHE = [
  { valor: 0, texto: 'Desligado' },
  { valor: 10, texto: '10 s' },
  { valor: 60, texto: '1 min' },
]

interface Props {
  atraso: number
  aoMudarAtraso: (ms: number) => void
  ttl: number
  aoMudarTtl: (segundos: number) => void
  tamanhoCache: number
  aoLimparCache: () => void
}

/** Controla a API falsa e os ajustes do useBusca. */
export function PainelSimular({ atraso, aoMudarAtraso, ttl, aoMudarTtl, tamanhoCache, aoLimparCache }: Props) {
  const sim = useSimulacao()

  return (
    <section className={`placa ${css.painel}`} aria-labelledby="simular-titulo">
      <h2 id="simular-titulo">Simular</h2>

      <div className={css.chaves}>
        <label className={css.chave}>
          <input type="checkbox" checked={sim.lenta} onChange={(e) => ajustarSimulacao({ lenta: e.target.checked })} />
          <span className={css.nomeChave}>Rede lenta</span>
          <small>respostas de 1,2 a 2,5 s</small>
        </label>
        <label className={css.chave}>
          <input type="checkbox" checked={sim.foraDeOrdem} onChange={(e) => ajustarSimulacao({ foraDeOrdem: e.target.checked })} />
          <span className={css.nomeChave}>Fora de ordem</span>
          <small>consulta curta demora mais, e o servidor ignora o cancelamento</small>
        </label>
        <label className={css.chave}>
          <input type="checkbox" checked={sim.semInternet} onChange={(e) => ajustarSimulacao({ semInternet: e.target.checked })} />
          <span className={css.nomeChave}>Sem internet</span>
          <small>o que já está no cache continua aparecendo</small>
        </label>
      </div>

      <fieldset className={css.grupo}>
        <legend>Erro do servidor</legend>
        <div className={css.segmentos}>
          {OPCOES_FALHA.map((o) => (
            <label key={o.valor} className={css.segmento}>
              <input type="radio" name="falhas" checked={sim.falhas === o.valor} onChange={() => ajustarSimulacao({ falhas: o.valor })} />
              <span>{o.texto}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <h2 className={css.subtitulo}>Ajustes da busca</h2>

      <div className={css.grupo}>
        <label htmlFor="atraso" className={css.legenda}>
          Debounce <output htmlFor="atraso">{atraso} ms</output>
        </label>
        <input
          id="atraso"
          className={css.faixa}
          type="range"
          min={0}
          max={1000}
          step={50}
          value={atraso}
          onChange={(e) => aoMudarAtraso(Number(e.target.value))}
        />
      </div>

      <fieldset className={css.grupo}>
        <legend>Validade do cache</legend>
        <div className={css.segmentos}>
          {OPCOES_CACHE.map((o) => (
            <label key={o.valor} className={css.segmento}>
              <input type="radio" name="ttl" checked={ttl === o.valor} onChange={() => aoMudarTtl(o.valor)} />
              <span>{o.texto}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className={css.cacheLinha}>
        <span>{tamanhoCache === 1 ? '1 consulta guardada' : `${tamanhoCache} consultas guardadas`}</span>
        <button type="button" className="botao pequeno" onClick={aoLimparCache} disabled={tamanhoCache === 0}>
          <Icone nome="lixeira" />
          Limpar cache
        </button>
      </div>
    </section>
  )
}
