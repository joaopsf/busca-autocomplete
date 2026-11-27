import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { criarApiCidades } from './api/cidades'
import { ajustarSimulacao, SIMULACAO_PADRAO } from './api/simulacao'

// API de verdade (lista completa do IBGE), com a menor latência do sorteio: 120 ms.
const montar = () => render(<App api={criarApiCidades({ sortear: () => 0 })} />)
const campo = () => screen.getByRole('combobox', { name: 'Cidade' })

afterEach(() => ajustarSimulacao(SIMULACAO_PADRAO))

describe('tela de busca', () => {
  it('"sao" acha "São ...", destaca o trecho com acento e escolhe pelo teclado', async () => {
    localStorage.setItem('busca-autocomplete:guia-fechado', '1')
    montar()
    await userEvent.type(campo(), 'sao jose dos campos')
    const opcao = await screen.findByRole('option', { name: /São José dos Campos/ }, { timeout: 3000 })
    expect(within(opcao).getByText('São José dos Campos', { selector: 'mark' })).toBeInTheDocument()
    expect(within(opcao).getByText('SP')).toBeInTheDocument()

    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(campo()).toHaveValue('São José dos Campos')
    expect(screen.getByText('código IBGE 3549904')).toBeInTheDocument()

    // Escolhida vira busca recente.
    await userEvent.clear(campo())
    expect(screen.getByRole('listbox', { name: 'Buscas recentes' })).toHaveTextContent('São José dos Campos')
    expect(screen.getByRole('heading', { name: 'Requisições' })).toBeInTheDocument()
  })

  it('sem internet mostra o aviso e não chama a API', async () => {
    localStorage.setItem('busca-autocomplete:guia-fechado', '1')
    montar()
    await userEvent.click(screen.getByRole('checkbox', { name: /Sem internet/ }))
    await userEvent.type(campo(), 'recife')
    expect(await screen.findByText(/A busca volta sozinha/)).toBeInTheDocument()
    expect(screen.getByText('Digite na busca pra ver as requisições aqui.')).toBeInTheDocument()
  })

  it('o guia abre na primeira visita, fecha lembrando no aparelho e volta pelo "Como testar"', async () => {
    montar()
    expect(screen.getByRole('heading', { name: 'Teste em 1 minuto' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Entendi' }))
    expect(localStorage.getItem('busca-autocomplete:guia-fechado')).toBe('1')
    expect(screen.queryByRole('heading', { name: 'Teste em 1 minuto' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Como testar' }))
    expect(screen.getByRole('heading', { name: 'Teste em 1 minuto' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'por João Paulo' })).toHaveAttribute('href', 'https://joaopaulo.omniahub.com.br')
  })
})
