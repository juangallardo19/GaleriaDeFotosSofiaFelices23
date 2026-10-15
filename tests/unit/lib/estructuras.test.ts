import { describe, expect, it } from 'vitest'
import { MinHeap } from '@/lib/ds/min-heap'
import { RingBuffer } from '@/lib/ds/ring-buffer'
import { UndoStack } from '@/lib/ds/undo-stack'

describe('MinHeap (cola de prioridad)', () => {
  it('saca siempre el menor según el comparador', () => {
    const heap = new MinHeap<number>((a, b) => a - b)
    for (const n of [5, 1, 9, 3, 7, 2]) heap.push(n)
    const out: number[] = []
    while (heap.size > 0) out.push(heap.pop()!)
    expect(out).toEqual([1, 2, 3, 5, 7, 9])
  })

  it('peek no modifica el tamaño y pop en vacío devuelve undefined', () => {
    const heap = new MinHeap<number>((a, b) => a - b)
    expect(heap.pop()).toBeUndefined()
    heap.push(4)
    expect(heap.peek()).toBe(4)
    expect(heap.size).toBe(1)
  })

  it('remove quita un elemento arbitrario y mantiene el orden', () => {
    const heap = new MinHeap<{ id: string; n: number }>((a, b) => a.n - b.n)
    ;[3, 1, 4, 1.5, 9].forEach((n, i) => heap.push({ id: `t${i}`, n }))
    expect(heap.remove((x) => x.id === 't2')?.n).toBe(4)
    const out: number[] = []
    while (heap.size) out.push(heap.pop()!.n)
    expect(out).toEqual([1, 1.5, 3, 9])
  })
})

describe('RingBuffer (buffer circular)', () => {
  it('conserva solo los últimos N elementos en orden de llegada', () => {
    const rb = new RingBuffer<number>(3)
    ;[1, 2, 3, 4, 5].forEach((n) => rb.push(n))
    expect(rb.toArray()).toEqual([3, 4, 5])
    expect(rb.size).toBe(3)
    expect(rb.capacity).toBe(3)
  })

  it('clear lo deja vacío', () => {
    const rb = new RingBuffer<number>(2)
    rb.push(1)
    rb.clear()
    expect(rb.toArray()).toEqual([])
  })
})

describe('UndoStack (pila para deshacer)', () => {
  it('es LIFO', () => {
    const s = new UndoStack<string>()
    s.push('a')
    s.push('b')
    expect(s.pop()).toBe('b')
    expect(s.peek()).toBe('a')
  })

  it('descarta lo más antiguo al superar el límite', () => {
    const s = new UndoStack<number>(2)
    ;[1, 2, 3].forEach((n) => s.push(n))
    expect(s.size).toBe(2)
    expect(s.pop()).toBe(3)
    expect(s.pop()).toBe(2)
    expect(s.pop()).toBeUndefined()
  })
})
