import { useCallback, useMemo, useReducer, useRef, useState } from 'react'
import { apiCidades, type RespostaCidades } from './api/cidades'
import type { Cidade } from './api/pesquisa'
import { useSimulacao } from './api/simulacao'
import { useBusca, type EventoBusca } from './busca/useBusca'
import { CacheTTL } from './lib/cache'
import { useNavegadorOnline } from './lib/online'
import { useRecentes } from './lib/recentes'
import { normalizar } from './lib/texto'
import css from './App.module.css'
import { Autocomplete } from './ui/Autocomplete'
import { Destaque } from './ui/Destaque'
import { GuiaRapido } from './ui/GuiaRapido'
import { Icone } from './ui/Icone'
import { LinhaDoTempo } from './ui/LinhaDoTempo'
import { PainelSimular } from './ui/PainelSimular'
import { registrar, type Linha } from './ui/registro'

// O guia aparece na primeira visita; depois de fechado, só volta pelo botão "Como testar".
const CHAVE_GUIA = 'busca-autocomplete:guia-fechado'
const CHAVE_RECENTES = 'busca-autocomplete:recentes'
const SEM_ITENS: readonly Cidade[] = []

const idDaCidade = (c: Cidade) => c.id
const textoDaCidade = (c: Cidade) => c.nome

function guiaJaFechado() {
  try {
    return localStorage.getItem(CHAVE_GUIA) === '1'
  } catch {
    return false
  }
}

interface Props {
  api?: { buscar: (consulta: string, signal: AbortSignal) => Promise<RespostaCidades> }
}

export default function App({ api = apiCidades }: Props) {
  const [guiaAberto, setGuiaAberto] = useState(() => !guiaJaFechado())
  const [texto, setTexto] = useState('')
  const [escolhida, setEscolhida] = useState<Cidade | null>(null)
  const [atraso, setAtraso] = useState(300)
  const [ttl, setTtl] = useState(60)
  const [linhas, setLinhas] = useState<Linha[]>([])
  const serial = useRef(0)
  // O cache mora fora do React; depois de limpar, só precisa redesenhar o contador.
  const [, redesenhar] = useReducer((n: number) => n + 1, 0)

  const sim = useSimulacao()
  const online = useNavegadorOnline() && !sim.semInternet
  const cache = useMemo(() => (ttl > 0 ? new CacheTTL<RespostaCidades>({ ttl: ttl * 1000 }) : undefined), [ttl])
  const { recentes, adicionar, limpar } = useRecentes<Cidade>(CHAVE_RECENTES, idDaCidade)

  const aoEvento = useCallback((e: EventoBusca) => setLinhas((atual) => registrar(atual, e, ++serial.current)), [])

  const busca = useBusca(texto, {
    buscar: api.buscar,
    atraso,
    cache,
    online,
    // A API ignora acento, então "sao" e "São" são a mesma consulta pro cache também.
    chaveDoCache: normalizar,
    aoEvento,
  })

  function mostrarGuia(aberto: boolean) {
    try {
      localStorage.setItem(CHAVE_GUIA, aberto ? '0' : '1')
    } catch {
      // Sem armazenamento, o guia volta na próxima visita. Não é motivo pra quebrar a tela.
    }
    setGuiaAberto(aberto)
  }

  function escolher(cidade: Cidade) {
    setEscolhida(cidade)
    adicionar(cidade)
  }

  return (
    <>
      <header className={css.topo}>
        <div className={css.topoConteudo}>
          <span className={css.logo}>
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="28" height="28" />
            Busca
          </span>
          <span className={css.descricao}>autocomplete sem race condition</span>
          {!guiaAberto && (
            <button type="button" className={css.comoTestar} onClick={() => mostrarGuia(true)}>
              <Icone nome="ajuda" />
              Como testar
            </button>
          )}
          <a className={css.autor} href="https://joaopaulo.omniahub.com.br" target="_blank" rel="noopener">
            por João Paulo
          </a>
        </div>
      </header>

      <main className={css.conteudo}>
        {guiaAberto && <GuiaRapido aoFechar={() => mostrarGuia(false)} />}

        <div className={css.grade}>
          <div className={css.principal}>
            <section className={`placa ${css.busca}`} aria-labelledby="busca-titulo">
              <h1 id="busca-titulo" className={css.titulo}>
                Onde fica?
              </h1>
              <p className={css.subtitulo}>Qualquer um dos 5.571 municípios do Brasil. Acento e maiúscula não importam.</p>
              <Autocomplete<Cidade>
                rotulo="Cidade"
                placeholder="Ex.: sao joao del rei"
                dica="Use vírgula pra filtrar por estado: santa maria, rs"
                valor={texto}
                aoMudarValor={setTexto}
                itens={busca.dados?.itens ?? SEM_ITENS}
                total={busca.dados?.total}
                consulta={busca.consulta}
                situacao={busca.situacao}
                doCache={busca.doCache}
                chave={idDaCidade}
                textoDoItem={textoDaCidade}
                aoEscolher={escolher}
                aoTentarDeNovo={busca.tentarDeNovo}
                recentes={recentes}
                aoLimparRecentes={limpar}
                renderizarItem={(c, { consulta }) => (
                  <>
                    <span className={css.nome}>
                      <Destaque texto={c.nome} consulta={consulta} />
                    </span>
                    {c.capital && <span className={css.capital}>capital</span>}
                    <span className={css.uf}>{c.uf}</span>
                  </>
                )}
              />

              {escolhida && (
                <div className={css.escolhida} aria-live="polite">
                  <Icone nome="pino" />
                  <div>
                    <strong>
                      {escolhida.nome}, {escolhida.uf}
                    </strong>
                    <span>código IBGE {escolhida.id}</span>
                  </div>
                </div>
              )}
            </section>

            <LinhaDoTempo linhas={linhas} />
          </div>

          <PainelSimular
            atraso={atraso}
            aoMudarAtraso={setAtraso}
            ttl={ttl}
            aoMudarTtl={setTtl}
            tamanhoCache={cache?.tamanho ?? 0}
            aoLimparCache={() => {
              cache?.limpar()
              redesenhar()
            }}
          />
        </div>
      </main>
    </>
  )
}
