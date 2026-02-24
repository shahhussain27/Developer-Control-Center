/**
 * Fixed-capacity ring buffer.
 *
 * When the buffer is full, the oldest entry is evicted to make room for the
 * new one — guaranteeing O(1) push and a hard upper bound on memory usage.
 */
export class RingBuffer<T> {
  private readonly buf: T[]
  private head = 0   // index of the oldest entry
  private size = 0   // current number of entries

  constructor(private readonly capacity: number) {
    if (capacity < 1) throw new RangeError('RingBuffer capacity must be >= 1')
    this.buf = new Array<T>(capacity)
  }

  /** Push a new item, evicting the oldest if the buffer is full. */
  push(item: T): void {
    if (this.size < this.capacity) {
      // Buffer not yet full — write past the current tail
      this.buf[(this.head + this.size) % this.capacity] = item
      this.size++
    } else {
      // Buffer full — overwrite the oldest slot and advance head
      this.buf[this.head] = item
      this.head = (this.head + 1) % this.capacity
    }
  }

  /** Return all items in insertion order (oldest → newest). */
  toArray(): T[] {
    const result: T[] = new Array<T>(this.size)
    for (let i = 0; i < this.size; i++) {
      result[i] = this.buf[(this.head + i) % this.capacity]
    }
    return result
  }

  /** Remove all items without reallocating the backing array. */
  clear(): void {
    this.head = 0
    this.size = 0
  }

  get length(): number {
    return this.size
  }
}
