export class MinHeap<T> {
  private items: T[] = []

  constructor(private readonly compare: (a: T, b: T) => number) {}

  get size() {
    return this.items.length
  }

  peek(): T | undefined {
    return this.items[0]
  }

  push(value: T) {
    this.items.push(value)
    this.siftUp(this.items.length - 1)
  }

  pop(): T | undefined {
    if (this.items.length === 0) return undefined
    const top = this.items[0]
    const last = this.items.pop()!
    if (this.items.length > 0) {
      this.items[0] = last
      this.siftDown(0)
    }
    return top
  }

  remove(predicate: (value: T) => boolean): T | undefined {
    const index = this.items.findIndex(predicate)
    if (index === -1) return undefined
    const removed = this.items[index]
    const last = this.items.pop()!
    if (index < this.items.length) {
      this.items[index] = last
      this.siftDown(index)
      this.siftUp(index)
    }
    return removed
  }

  toArray(): T[] {
    return [...this.items]
  }

  private siftUp(index: number) {
    let i = index
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.compare(this.items[i], this.items[parent]) >= 0) break
      this.swap(i, parent)
      i = parent
    }
  }

  private siftDown(index: number) {
    let i = index
    const n = this.items.length
    for (;;) {
      const left = 2 * i + 1
      const right = left + 1
      let smallest = i
      if (left < n && this.compare(this.items[left], this.items[smallest]) < 0) smallest = left
      if (right < n && this.compare(this.items[right], this.items[smallest]) < 0) smallest = right
      if (smallest === i) return
      this.swap(i, smallest)
      i = smallest
    }
  }

  private swap(a: number, b: number) {
    ;[this.items[a], this.items[b]] = [this.items[b], this.items[a]]
  }
}
