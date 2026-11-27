import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { adicionarRecente, useRecentes } from './recentes'

const id = (x: { id: number }) => x.id

describe('buscas recentes', () => {
  it('põe no topo, não repete e corta no máximo', () => {
    let lista = [{ id: 1 }, { id: 2 }, { id: 3 }]
    lista = adicionarRecente(lista, { id: 3 }, id, 3)
    expect(lista.map(id)).toEqual([3, 1, 2])
    lista = adicionarRecente(lista, { id: 4 }, id, 3)
    expect(lista.map(id)).toEqual([4, 3, 1])
  })

  it('lembra no aparelho e limpa', () => {
    const { result, unmount } = renderHook(() => useRecentes<{ id: number }>('teste:recentes', id))
    act(() => result.current.adicionar({ id: 7 }))
    unmount()
    const outra = renderHook(() => useRecentes<{ id: number }>('teste:recentes', id))
    expect(outra.result.current.recentes).toEqual([{ id: 7 }])
    act(() => outra.result.current.limpar())
    expect(localStorage.getItem('teste:recentes')).toBe('[]')
  })

  it('JSON quebrado no armazenamento não derruba a tela', () => {
    localStorage.setItem('teste:recentes', '{quebrado')
    const { result } = renderHook(() => useRecentes('teste:recentes', id))
    expect(result.current.recentes).toEqual([])
  })
})
