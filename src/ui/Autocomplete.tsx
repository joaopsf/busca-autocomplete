/*
 * O padrão de combobox do WAI-ARIA usa <ul role="listbox"> e <li role="option"> de propósito:
 * <select> e <datalist> não deixam estilizar nem destacar trecho, e o teclado das opções
 * mora no campo (aria-activedescendant), não em cada <li>. Por isso estas regras ficam desligadas aqui.
 */
/* oxlint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-element-to-interactive-role, jsx-a11y/click-events-have-key-events */
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import type { Situacao } from '../busca/useBusca'
import css from './Autocomplete.module.css'
import { Icone } from './Icone'

export interface PropsAutocomplete<T> {
  rotulo: string
  valor: string
  aoMudarValor: (valor: string) => void
  /** Resultados da consulta atual. */
  itens: readonly T[]
  /** Chave estável do item (id do banco, por exemplo). */
  chave: (item: T) => string | number
  /** Texto que vai pro campo quando o item é escolhido. */
  textoDoItem: (item: T) => string
  aoEscolher: (item: T) => void
  situacao: Situacao
  /** Consulta a que os itens respondem, pra destacar o trecho certo mesmo enquanto a próxima carrega. */
  consulta?: string
  renderizarItem?: (item: T, contexto: { consulta: string; ativo: boolean }) => ReactNode
  /** Total encontrado, quando a lista mostra só uma parte. */
  total?: number
  doCache?: boolean
  /** Mostrados quando o campo está vazio. */
  recentes?: readonly T[]
  aoLimparRecentes?: () => void
  aoTentarDeNovo?: () => void
  dica?: string
  placeholder?: string
}

const NENHUM: readonly never[] = []

function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`
}

/**
 * Combobox no padrão WAI-ARIA 1.2 (campo editável com lista de sugestões).
 * O foco nunca sai do campo: a opção "ativa" é indicada por aria-activedescendant.
 */
export function Autocomplete<T>(props: PropsAutocomplete<T>) {
  const { rotulo, valor, aoMudarValor, itens, chave, textoDoItem, aoEscolher, situacao, total, doCache, recentes = NENHUM } = props
  const base = useId()
  const idLista = `${base}-lista`
  const idDica = `${base}-dica`
  const lista = useRef<HTMLUListElement>(null)
  const [aberto, setAberto] = useState(false)

  const mostrandoRecentes = valor.trim() === ''
  const opcoes = mostrandoRecentes ? recentes : situacao === 'erro' || situacao === 'offline' ? NENHUM : itens
  const consulta = mostrandoRecentes ? '' : (props.consulta ?? valor)

  // A opção ativa vale só pra lista em que foi escolhida: chegou lista nova, volta pra nenhuma.
  // Guardar junto com a lista evita um useEffect só pra zerar o índice.
  const [marcado, setMarcado] = useState<{ de: readonly T[]; indice: number }>({ de: opcoes, indice: -1 })
  const ativo = marcado.de === opcoes ? marcado.indice : -1

  const temMensagem = !mostrandoRecentes && situacao !== 'ocioso'
  const visivel = aberto && (opcoes.length > 0 || temMensagem)

  function marcar(indice: number) {
    setMarcado({ de: opcoes, indice })
    const opcao = lista.current?.querySelector<HTMLElement>(`[data-indice="${indice}"]`)
    opcao?.scrollIntoView?.({ block: 'nearest' })
  }

  function escolher(item: T) {
    aoMudarValor(textoDoItem(item))
    aoEscolher(item)
    setAberto(false)
  }

  function aoTeclar(e: KeyboardEvent<HTMLInputElement>) {
    const n = opcoes.length
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!visivel) {
          setAberto(true)
          if (!e.altKey && n > 0) marcar(0)
        } else if (n > 0) marcar(ativo + 1 >= n ? 0 : ativo + 1)
        break
      case 'ArrowUp':
        e.preventDefault()
        if (!visivel) {
          setAberto(true)
          if (n > 0) marcar(n - 1)
        } else if (n > 0) marcar(ativo <= 0 ? n - 1 : ativo - 1)
        break
      case 'Home':
      case 'End':
        // Só navega na lista se a pessoa já estiver nela. Senão, Home e End movem o cursor no texto, como sempre.
        if (visivel && ativo >= 0 && n > 0) {
          e.preventDefault()
          marcar(e.key === 'Home' ? 0 : n - 1)
        }
        break
      case 'Enter': {
        const item = visivel ? opcoes[ativo] : undefined
        if (item !== undefined) {
          e.preventDefault()
          escolher(item)
        }
        break
      }
      case 'Escape':
        if (visivel) {
          e.preventDefault()
          setAberto(false)
        } else if (valor) {
          e.preventDefault()
          aoMudarValor('')
        }
        break
      case 'Tab':
        setAberto(false)
        break
    }
  }

  // O que o leitor de tela anuncia. Fica vazio enquanto carrega pra não falar "buscando" a cada tecla.
  let anuncio = ''
  if (visivel) {
    if (mostrandoRecentes) anuncio = plural(opcoes.length, 'busca recente', 'buscas recentes')
    else if (situacao === 'sucesso')
      anuncio =
        total !== undefined && total > opcoes.length
          ? `${opcoes.length} de ${plural(total, 'resultado', 'resultados')}`
          : plural(opcoes.length, 'resultado', 'resultados')
    else if (situacao === 'vazio') anuncio = 'Nenhum resultado'
    else if (situacao === 'erro') anuncio = 'Erro na busca. Tente de novo.'
    else if (situacao === 'offline') anuncio = 'Sem conexão'
  }

  const carregando = situacao === 'carregando' && !mostrandoRecentes

  return (
    <div className={css.caixa}>
      <label className={css.rotulo} htmlFor={`${base}-campo`}>
        {rotulo}
      </label>
      <div className={css.ancora}>
        <div className={css.campoLinha} data-carregando={carregando || undefined}>
          <Icone nome="lupa" />
          <input
            id={`${base}-campo`}
            className={css.campo}
            type="text"
            role="combobox"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-autocomplete="list"
            aria-expanded={visivel}
            aria-controls={idLista}
            aria-activedescendant={visivel && ativo >= 0 ? `${base}-op-${ativo}` : undefined}
            aria-describedby={props.dica ? idDica : undefined}
            aria-busy={carregando || undefined}
            placeholder={props.placeholder}
            value={valor}
            onChange={(e) => {
              // Digitou: a opção marcada era da lista anterior, então desmarca (senão o Enter escolheria um resultado velho).
              setMarcado({ de: opcoes, indice: -1 })
              aoMudarValor(e.target.value)
              setAberto(true)
            }}
            onFocus={() => setAberto(true)}
            onBlur={() => setAberto(false)}
            onClick={() => setAberto(true)}
            onKeyDown={aoTeclar}
          />
          {carregando && <span className={css.girando} aria-hidden="true" />}
          {valor && (
            <button
              type="button"
              className={css.limpar}
              aria-label="Limpar busca"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => aoMudarValor('')}
            >
              <Icone nome="fechar" />
            </button>
          )}
        </div>

        {/* O mousedown não pode tirar o foco do campo: o blur fecharia a lista antes do clique chegar na opção. */}
        <div className={css.painel} role="presentation" hidden={!visivel} onMouseDown={(e) => e.preventDefault()}>
          {mostrandoRecentes && opcoes.length > 0 && (
            <div className={css.cabeca}>
              <span id={`${base}-titulo-recentes`}>Buscas recentes</span>
              {props.aoLimparRecentes && (
                <button type="button" className={css.linkBotao} onClick={props.aoLimparRecentes}>
                  Limpar
                </button>
              )}
            </div>
          )}
          <ul
            ref={lista}
            id={idLista}
            role="listbox"
            aria-label={mostrandoRecentes ? 'Buscas recentes' : rotulo}
            className={css.lista}
            data-velha={carregando || undefined}
          >
            {opcoes.map((item, i) => (
              <li
                key={chave(item)}
                id={`${base}-op-${i}`}
                data-indice={i}
                role="option"
                aria-selected={i === ativo}
                className={css.opcao}
                onMouseMove={() => i !== ativo && marcar(i)}
                onClick={() => escolher(item)}
              >
                {mostrandoRecentes && <Icone nome="relogio" />}
                {props.renderizarItem ? props.renderizarItem(item, { consulta, ativo: i === ativo }) : textoDoItem(item)}
              </li>
            ))}
          </ul>

          {!mostrandoRecentes && (
            <div className={css.rodape}>
              {situacao === 'carregando' && opcoes.length === 0 && <span>Buscando…</span>}
              {situacao === 'sucesso' && (
                <span>
                  {total !== undefined && total > opcoes.length
                    ? `${opcoes.length} de ${total}, continue digitando pra refinar`
                    : plural(opcoes.length, 'resultado', 'resultados')}
                  {doCache && <span className={css.selo}>do cache</span>}
                </span>
              )}
              {situacao === 'vazio' && (
                <span>
                  Nada encontrado para <b>“{consulta}”</b>.{doCache && <span className={css.selo}>do cache</span>}
                </span>
              )}
              {situacao === 'offline' && (
                <span className={css.aviso}>
                  <Icone nome="semRede" />
                  Sem internet. A busca volta sozinha quando a conexão voltar.
                </span>
              )}
              {situacao === 'erro' && (
                <span className={css.aviso}>
                  <Icone nome="alerta" />
                  Não deu pra buscar agora.
                  {props.aoTentarDeNovo && (
                    <button type="button" className={css.tentar} onClick={props.aoTentarDeNovo}>
                      <Icone nome="recomecar" />
                      Tentar de novo
                    </button>
                  )}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      {props.dica && (
        <p id={idDica} className={css.dica}>
          {props.dica}
        </p>
      )}

      <output className="sr" aria-live="polite">
        {anuncio}
      </output>
    </div>
  )
}
