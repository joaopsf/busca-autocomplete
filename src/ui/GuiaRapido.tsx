import css from './GuiaRapido.module.css'
import { Icone } from './Icone'

// Caixa "Teste em 1 minuto": diz pra quem chega pelo link o que o app faz e o que testar.
// Quem decide se ela aparece é o App (lembra no aparelho e reabre pelo "Como testar").
export function GuiaRapido({ aoFechar }: { aoFechar: () => void }) {
  return (
    <section className={css.guia} aria-labelledby="guia-titulo">
      <div className={css.cabeca}>
        <h2 id="guia-titulo">Teste em 1 minuto</h2>
        <button type="button" className={css.fechar} aria-label="Fechar o guia" onClick={aoFechar}>
          ×
        </button>
      </div>
      <p className={css.oque}>
        Busca de cidades com autocomplete, do jeito que pedem em teste técnico: acessível pelo teclado, sem race condition e com os 5.571
        municípios do IBGE.
      </p>
      <ol>
        <li>
          Digite <b>sao</b> (sem acento). Use as setas, Home, End e Enter pra escolher, e Esc pra fechar.
        </li>
        <li>
          Em <b>Simular</b>, ligue <b>Fora de ordem</b>, digite <b>rio</b>, espere meio segundo e complete <b>rio branco</b>. Em{' '}
          <b>Requisições</b>, a resposta de “rio” chega depois e é descartada.
        </li>
        <li>
          Ponha o erro em <b>Todas</b>, busque algo novo, volte pra <b>Nenhuma</b> e clique em <b>Tentar de novo</b>.
        </li>
        <li>
          Ligue <b>Sem internet</b> e repita uma busca que você já fez: ela vem do cache.
        </li>
      </ol>
      <p className={css.reparar}>
        <b>Repare:</b> com a rede normal, a requisição antiga é cancelada na hora (aparece “cancelada”). Mesmo quando o servidor ignora o
        cancelamento, a resposta velha nunca sobrescreve a nova.
      </p>
      <button type="button" className="botao primario" onClick={aoFechar}>
        <Icone nome="concluir" />
        Entendi
      </button>
    </section>
  )
}
