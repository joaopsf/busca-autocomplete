import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { Situacao } from '../busca/useBusca'
import { Autocomplete } from './Autocomplete'

interface Fruta {
  id: number
  nome: string
}
const FRUTAS: Fruta[] = [
  { id: 1, nome: 'Açaí' },
  { id: 2, nome: 'Acerola' },
  { id: 3, nome: 'Abacaxi' },
]

function Teste({
  situacao = 'sucesso',
  itens = FRUTAS,
  recentes,
  total,
  inicial = 'a',
  aoEscolher = () => {},
  aoTentarDeNovo,
}: {
  situacao?: Situacao
  itens?: Fruta[]
  recentes?: Fruta[]
  total?: number
  inicial?: string
  aoEscolher?: (f: Fruta) => void
  aoTentarDeNovo?: () => void
}) {
  const [valor, setValor] = useState(inicial)
  return (
    <Autocomplete<Fruta>
      rotulo="Fruta"
      valor={valor}
      aoMudarValor={setValor}
      itens={itens}
      total={total}
      situacao={situacao}
      chave={(f) => f.id}
      textoDoItem={(f) => f.nome}
      aoEscolher={aoEscolher}
      recentes={recentes}
      aoTentarDeNovo={aoTentarDeNovo}
    />
  )
}

const campo = () => screen.getByRole('combobox', { name: 'Fruta' })
const ativa = () => {
  const id = campo().getAttribute('aria-activedescendant')
  return id ? document.getElementById(id)?.textContent : null
}

describe('Autocomplete: papéis e atributos ARIA', () => {
  it('campo é combobox ligado à listbox, fechado até ganhar foco', async () => {
    render(<Teste />)
    expect(campo()).toHaveAttribute('aria-expanded', 'false')
    expect(campo()).toHaveAttribute('aria-autocomplete', 'list')
    const idLista = campo().getAttribute('aria-controls')
    expect(document.getElementById(idLista!)).toHaveAttribute('role', 'listbox')

    await userEvent.click(campo())
    expect(campo()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('option')).toHaveLength(3)
    expect(campo()).not.toHaveAttribute('aria-activedescendant')
  })

  it('anuncia "N resultados" pro leitor de tela, e "N de total" quando corta', async () => {
    const { rerender } = render(<Teste />)
    await userEvent.click(campo())
    expect(screen.getByRole('status')).toHaveTextContent('3 resultados')
    rerender(<Teste total={40} />)
    expect(screen.getByRole('status')).toHaveTextContent('3 de 40 resultados')
    rerender(<Teste itens={FRUTAS.slice(0, 1)} />)
    expect(screen.getByRole('status')).toHaveTextContent('1 resultado')
  })

  it('não anuncia "buscando" a cada tecla, nem nada com a lista fechada', async () => {
    const { rerender } = render(<Teste situacao="carregando" />)
    await userEvent.click(campo())
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    rerender(<Teste />)
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })
})

describe('Autocomplete: teclado', () => {
  it('setas movem a opção ativa (o foco fica no campo) e dão a volta', async () => {
    render(<Teste />)
    await userEvent.click(campo())
    await userEvent.keyboard('{ArrowDown}')
    expect(ativa()).toBe('Açaí')
    expect(screen.getByRole('option', { name: 'Açaí' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{ArrowDown}{ArrowDown}')
    expect(ativa()).toBe('Abacaxi')
    await userEvent.keyboard('{ArrowDown}')
    expect(ativa()).toBe('Açaí')
    await userEvent.keyboard('{ArrowUp}')
    expect(ativa()).toBe('Abacaxi')
    expect(campo()).toHaveFocus()
  })

  it('Home e End vão pra primeira e última opção quando já está navegando na lista', async () => {
    render(<Teste />)
    await userEvent.click(campo())
    await userEvent.keyboard('{ArrowDown}{End}')
    expect(ativa()).toBe('Abacaxi')
    await userEvent.keyboard('{Home}')
    expect(ativa()).toBe('Açaí')
  })

  it('sem opção ativa, Home e End continuam movendo o cursor no texto', async () => {
    render(<Teste inicial="aba" />)
    await userEvent.click(campo())
    await userEvent.keyboard('{Home}')
    expect(ativa()).toBeNull()
    expect((campo() as HTMLInputElement).selectionStart).toBe(0)
  })

  it('Enter escolhe a opção ativa, põe o texto no campo e fecha', async () => {
    const aoEscolher = vi.fn<(f: Fruta) => void>()
    render(<Teste aoEscolher={aoEscolher} />)
    await userEvent.click(campo())
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(aoEscolher).toHaveBeenCalledWith(FRUTAS[1])
    expect(campo()).toHaveValue('Acerola')
    expect(campo()).toHaveAttribute('aria-expanded', 'false')
  })

  it('Enter sem opção ativa não escolhe nada', async () => {
    const aoEscolher = vi.fn<(f: Fruta) => void>()
    render(<Teste aoEscolher={aoEscolher} />)
    await userEvent.click(campo())
    await userEvent.keyboard('{Enter}')
    expect(aoEscolher).not.toHaveBeenCalled()
  })

  it('Esc fecha a lista; Esc de novo limpa o campo', async () => {
    render(<Teste />)
    await userEvent.click(campo())
    await userEvent.keyboard('{ArrowDown}{Escape}')
    expect(campo()).toHaveAttribute('aria-expanded', 'false')
    expect(campo()).not.toHaveAttribute('aria-activedescendant')
    expect(campo()).toHaveValue('a')
    await userEvent.keyboard('{Escape}')
    expect(campo()).toHaveValue('')
  })

  it('seta pra baixo reabre a lista fechada já na primeira opção', async () => {
    render(<Teste />)
    await userEvent.click(campo())
    await userEvent.keyboard('{Escape}{ArrowDown}')
    expect(campo()).toHaveAttribute('aria-expanded', 'true')
    expect(ativa()).toBe('Açaí')
  })

  it('digitar desmarca a opção ativa, pro Enter não escolher resultado velho', async () => {
    const aoEscolher = vi.fn<(f: Fruta) => void>()
    render(<Teste aoEscolher={aoEscolher} />)
    await userEvent.click(campo())
    await userEvent.keyboard('{ArrowDown}c{Enter}')
    expect(aoEscolher).not.toHaveBeenCalled()
    expect(campo()).not.toHaveAttribute('aria-activedescendant')
  })
})

describe('Autocomplete: mouse e estados', () => {
  it('clicar numa opção escolhe sem perder o foco antes', async () => {
    const aoEscolher = vi.fn<(f: Fruta) => void>()
    render(<Teste aoEscolher={aoEscolher} />)
    await userEvent.click(campo())
    await userEvent.click(screen.getByRole('option', { name: 'Abacaxi' }))
    expect(aoEscolher).toHaveBeenCalledWith(FRUTAS[2])
  })

  it('erro mostra a mensagem e o "Tentar de novo"', async () => {
    const aoTentarDeNovo = vi.fn<() => void>()
    render(<Teste situacao="erro" aoTentarDeNovo={aoTentarDeNovo} />)
    await userEvent.click(campo())
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(screen.getByRole('status')).toHaveTextContent('Erro na busca')
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(aoTentarDeNovo).toHaveBeenCalledTimes(1)
    expect(campo()).toHaveFocus()
  })

  it('vazio e offline têm mensagem própria', async () => {
    const { rerender } = render(<Teste situacao="vazio" itens={[]} inicial="xyz" />)
    await userEvent.click(campo())
    expect(screen.getByText(/Nada encontrado/)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Nenhum resultado')
    rerender(<Teste situacao="offline" itens={[]} inicial="xyz" />)
    expect(screen.getByText(/Sem internet/)).toBeInTheDocument()
  })

  it('campo vazio mostra as buscas recentes, navegáveis pelo teclado', async () => {
    const aoEscolher = vi.fn<(f: Fruta) => void>()
    render(<Teste inicial="" situacao="ocioso" itens={[]} recentes={[FRUTAS[2]!]} aoEscolher={aoEscolher} />)
    await userEvent.click(campo())
    expect(screen.getByRole('listbox', { name: 'Buscas recentes' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('1 busca recente')
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(aoEscolher).toHaveBeenCalledWith(FRUTAS[2])
  })
})
