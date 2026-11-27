import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { GuiaRapido } from './GuiaRapido'

describe('guia "Teste em 1 minuto"', () => {
  it('diz o que fazer e o que reparar', () => {
    render(<GuiaRapido aoFechar={() => {}} />)
    expect(screen.getByRole('heading', { name: 'Teste em 1 minuto' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
    expect(screen.getByText(/nunca sobrescreve a nova/)).toBeInTheDocument()
  })

  it('"Entendi" e o × fecham', async () => {
    const aoFechar = vi.fn<() => void>()
    render(<GuiaRapido aoFechar={aoFechar} />)
    await userEvent.click(screen.getByRole('button', { name: 'Entendi' }))
    await userEvent.click(screen.getByRole('button', { name: 'Fechar o guia' }))
    expect(aoFechar).toHaveBeenCalledTimes(2)
  })
})
