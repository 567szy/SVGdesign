import { EditorError } from "./EditorError.js";
import { Group } from "./Group.js";
import { IdRegistry } from "./IdRegistry.js";
import type { Shape } from "./Shape.js";

export class SvgDocument {
  readonly ids = new IdRegistry();
  sourcePath?: string;
  private readonly roots: Shape[] = [];

  constructor(
    public width: number,
    public height: number,
  ) {}

  get children(): Shape[] {
    return this.roots;
  }

  get elementCount(): number {
    return this.ids.size;
  }

  add(shape: Shape, containerId?: string, index?: number): void {
    this.ids.registerTree(shape);
    const parent = containerId ? this.requireContainer(containerId) : undefined;
    this.attach(shape, parent, index);
  }

  attach(shape: Shape, parent?: Group, index?: number): void {
    if (parent) {
      parent.addChild(shape, index);
      return;
    }
    if (index === undefined || index >= this.roots.length) {
      this.roots.push(shape);
      return;
    }
    this.roots.splice(index, 0, shape);
  }

  detach(shape: Shape): { parent?: Group; index: number } {
    const parent = shape.parent;
    if (parent) {
      const index = parent.removeChild(shape);
      return { parent, index };
    }
    const index = this.roots.indexOf(shape);
    if (index < 0) {
      throw new EditorError(`no such shape: ${shape.id}`);
    }
    this.roots.splice(index, 1);
    return { index };
  }

  delete(shape: Shape): { parent?: Group; index: number } {
    const location = this.detach(shape);
    this.ids.unregister(shape);
    return location;
  }

  restore(shape: Shape, parent?: Group, index?: number): void {
    this.ids.registerTree(shape);
    this.attach(shape, parent, index);
  }

  requireContainer(id: string): Group {
    const shape = this.ids.tryGet(id);
    if (!shape) {
      throw new EditorError(`no such container: ${id}`);
    }
    if (!(shape instanceof Group)) {
      throw new EditorError(`not a container: ${id}`);
    }
    return shape;
  }

  isTopLevel(shape: Shape): boolean {
    return shape.parent === null && this.roots.includes(shape);
  }

  toTree(rootId?: string): string {
    if (!rootId) {
      const lines = [`svg (${this.width}x${this.height})`];
      this.appendTree(lines, this.roots, "");
      return lines.join("\n");
    }
    const shape = this.ids.get(rootId);
    const lines = [shape.toTreeLine()];
    this.appendTree(lines, shape.children(), "");
    return lines.join("\n");
  }

  show(id: string): string {
    const shape = this.ids.get(id);
    const parent = shape.parent ? `g#${shape.parent.id}` : "svg";
    const lines = [`${shape.tagName}#${shape.id}  parent=${parent}`, shape.toTreeLine()];
    return lines.join("\n");
  }

  toSvg(): string {
    const inner = this.roots.map((child) => child.toSvg(1)).join("\n");
    return [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}">`,
      inner,
      `</svg>`,
      "",
    ].join("\n");
  }

  private appendTree(lines: string[], shapes: Shape[], prefix: string): void {
    shapes.forEach((shape, index) => {
      const last = index === shapes.length - 1;
      const branch = last ? "└── " : "├── ";
      lines.push(`${prefix}${branch}${shape.toTreeLine()}`);
      const childPrefix = prefix + (last ? "    " : "│   ");
      this.appendTree(lines, shape.children(), childPrefix);
    });
  }
}
