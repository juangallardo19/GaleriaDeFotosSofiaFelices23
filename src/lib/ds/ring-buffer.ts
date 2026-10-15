export class RingBuffer<T> {
  private buffer: (T | undefined)[]
  private start = 0
  private count = 0

  constructor(readonly capacity: number) {
    if (capacity < 1) throw new RangeError('capacity debe ser >= 1')
    this.buffer = new Array(capacity)
  }

  get size() {
    return this.count
  }

  push(value: T) {
    const index = (this.start + this.count) % this.capacity
    this.buffer[index] = value
    if (this.count < this.capacity) this.count++
    else this.start = (this.start + 1) % this.capacity
  }

  toArray(): T[] {
    return Array.from({ length: this.count }, (_, i) => this.buffer[(this.start + i) % this.capacity] as T)
  }

  clear() {
    this.buffer = new Array(this.capacity)
    this.start = 0
    this.count = 0
  }
}
