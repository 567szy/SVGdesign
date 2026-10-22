import { EditorError } from "./EditorError.js";
import type { Shape } from "./Shape.js";

export class IdRegistry {
  private readonly byId = new Map<string, Shape>();
  private readonly counters = new Map<string, number>();

  has(id: string): boolean {
    return this.byId.has(id);
  }

  get(id: string): Shape {
    const shape = this.byId.get(id);
    if (!shape) {
      throw new EditorError(`no such shape: ${id}`);
    }
    return shape;
  }

  tryGet(id: string): Shape | undefined {
    return this.byId.get(id);
  }

  register(shape: Shape): void {
    if (this.byId.has(shape.id)) {
      throw new EditorError(`id already exists: ${shape.id}`);
    }
    this.byId.set(shape.id, shape);
  }

  unregisterSelf(shape: Shape): void {
    this.byId.delete(shape.id);
  }

  unregister(shape: Shape): void {
    this.unregisterSelf(shape);
    for (const child of shape.children()) {
      this.unregister(child);
    }
  }

  registerTree(shape: Shape): void {
    this.register(shape);
    for (const child of shape.children()) {
      this.registerTree(child);
    }
  }

  assignMissingId(tagName: string): string {
    let n = this.counters.get(tagName) ?? 0;
    let candidate: string;
    do {
      n += 1;
      candidate = `${tagName}${n}`;
    } while (this.byId.has(candidate));
    this.counters.set(tagName, n);
    return candidate;
  }

  get size(): number {
    return this.byId.size;
  }
}
