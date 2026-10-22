import { EditorError } from "../core/EditorError.js";
import { Shape } from "../core/Shape.js";

export class Text extends Shape {
  constructor(
    id: string,
    private x: number,
    private y: number,
    private content: string,
  ) {
    super(id);
  }

  get tagName(): string {
    return "text";
  }

  get text(): string {
    return this.content;
  }

  move(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }

  scale(factor: number): void {
    this.x *= factor;
    this.y *= factor;
  }

  override getAttribute(attr: string): string | undefined {
    if (attr === "x") {
      return this.formatNumber(this.x);
    }
    if (attr === "y") {
      return this.formatNumber(this.y);
    }
    if (attr === "text") {
      return this.content;
    }
    return super.getAttribute(attr);
  }

  setAttribute(attr: string, value: string): void {
    if (attr === "text") {
      this.content = value;
      return;
    }
    if (this.setStyleAttribute(attr, value)) {
      return;
    }
    const n = Number(value);
    if (attr === "x") {
      this.x = n;
      return;
    }
    if (attr === "y") {
      this.y = n;
      return;
    }
    throw new EditorError(`unknown attribute: ${attr}`);
  }

  treeGeometry(): string {
    return `(${this.formatNumber(this.x)},${this.formatNumber(this.y)}) "${this.content}"`;
  }

  cloneDeep(): Text {
    const copy = new Text(this.id, this.x, this.y, this.content);
    copy.fill = this.fill;
    copy.stroke = this.stroke;
    copy.strokeWidth = this.strokeWidth;
    return copy;
  }

  override toSvg(indent: number): string {
    const pad = "  ".repeat(indent);
    return `${pad}<text id="${this.escape(this.id)}" x="${this.formatNumber(this.x)}" y="${this.formatNumber(this.y)}"${this.styleAttributeString()}>${this.escape(this.content)}</text>`;
  }
}
