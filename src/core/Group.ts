import { EditorError } from "./EditorError.js";
import { Shape } from "./Shape.js";

export class Group extends Shape {
  private readonly _children: Shape[] = [];

  get tagName(): string {
    return "g";
  }

  override isContainer(): boolean {
    return true;
  }

  override children(): Shape[] {
    return this._children;
  }

  addChild(shape: Shape, index?: number): void {
    shape.setParent(this);
    if (index === undefined || index >= this._children.length) {
      this._children.push(shape);
      return;
    }
    this._children.splice(index, 0, shape);
  }

  removeChild(shape: Shape): number {
    const index = this._children.indexOf(shape);
    if (index < 0) {
      throw new EditorError(`no such shape: ${shape.id}`);
    }
    this._children.splice(index, 1);
    shape.setParent(null);
    return index;
  }

  takeChildren(): Shape[] {
    const all = [...this._children];
    for (const child of all) {
      this.removeChild(child);
    }
    return all;
  }

  indexOf(shape: Shape): number {
    return this._children.indexOf(shape);
  }

  moveToFront(shape: Shape): void {
    const index = this.removeChild(shape);
    this.addChild(shape);
    void index;
  }

  moveToBack(shape: Shape): void {
    this.removeChild(shape);
    this.addChild(shape, 0);
  }

  contains(shape: Shape): boolean {
    for (const child of this._children) {
      if (child === shape) {
        return true;
      }
      if (child instanceof Group && child.contains(shape)) {
        return true;
      }
    }
    return false;
  }

  move(dx: number, dy: number): void {
    for (const child of this._children) {
      child.move(dx, dy);
    }
  }

  scale(factor: number): void {
    for (const child of this._children) {
      child.scale(factor);
    }
  }

  override getAttribute(attr: string): string | undefined {
    return super.getAttribute(attr);
  }

  setAttribute(attr: string, value: string): void {
    if (this.setStyleAttribute(attr, value)) {
      return;
    }
    throw new EditorError(`unknown attribute: ${attr}`);
  }

  toTreeLine(): string {
    return `g#${this.id}`;
  }

  cloneDeep(): Group {
    const copy = new Group(this.id);
    copy.fill = this.fill;
    copy.stroke = this.stroke;
    copy.strokeWidth = this.strokeWidth;
    for (const child of this._children) {
      copy.addChild(child.cloneDeep());
    }
    return copy;
  }

  override toSvg(indent: number): string {
    const pad = "  ".repeat(indent);
    const open = `${pad}<g${this.svgIdAndAttrs()}>`;
    if (this._children.length === 0) {
      return `${pad}<g${this.svgIdAndAttrs()}/>`;
    }
    const body = this._children.map((child) => child.toSvg(indent + 1)).join("\n");
    return `${open}\n${body}\n${pad}</g>`;
  }
}
