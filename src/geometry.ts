export class Vector2d {
  x: number
  y: number
  static add(a: Vector2d, b: Vector2d): Vector2d {
    return { x: a.x + b.x, y: a.y + b.y }
  }

  static subtract(a: Vector2d, b: Vector2d): Vector2d {
    return { x: a.x - b.x, y: a.y - b.y }
  }

  static compare(a: Vector2d, b: Vector2d) {
    return a.x === b.x && a.y === b.y
  }

  static floor(a: Vector2d) {
    return { x: Math.floor(a.x), y: Math.floor(a.y) }
  }
}

export class Rect {
  pos: Vector2d
  size: Vector2d

  constructor(pos: Vector2d, size: Vector2d) {
    this.pos = pos
    this.size = size
  }
  hit(v: Vector2d) {
    return v.x >= this.pos.x && v.x <= this.pos.x + this.size.x && this.pos.y && v.y <= this.pos.y + this.size.y
  }
  get left() {
    return this.pos.x
  }
  get right() {
    return this.pos.x + this.size.x
  }
  get top() {
    return this.pos.y
  }
  get bottom() {
    return this.pos.y + this.size.y
  }

  static compare(a: Rect, b: Rect): boolean {
    return a.size.x === b.size.x && a.size.y === b.size.y && a.pos.x === b.pos.x && a.pos.y === b.pos.y
  }
}
