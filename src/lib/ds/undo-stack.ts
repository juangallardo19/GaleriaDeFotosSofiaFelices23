export class UndoStack<T> {
  private items: T[] = []

  constructor(private readonly limit = 20) {}

  get size() {
    return this.items.length
  }

  push(value: T) {
    this.items.push(value)
    if (this.items.length > this.limit) this.items.shift()
  }

  pop(): T | undefined {
    return this.items.pop()
  }

  peek(): T | undefined {
    return this.items.at(-1)
  }

  clear() {
    this.items = []
  }
}
