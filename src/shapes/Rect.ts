import { EditorError } from "../core/EditorError.js";
import { Shape } from "../core/Shape.js";

export class Rect extends Shape {
  constructor(
    id: string,
    private x: number,
    private y: number,
    private width: number,
    private height: number,
    fill?: string,
  ) {
    super(id);
    this.fill = fill;
  }

  get tagName(): string {
    return "rect";
  }

  move(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }

  scale(factor: number): void {
    this.x *= factor;
    this.y *= factor;
    this.width *= factor;
    this.height *= factor;
  }

  override getAttribute(attr: string): string | undefined {
    if (attr === "x") {
      return this.formatNumber(this.x);
    }
    if (attr === "y") {
      return this.formatNumber(this.y);
    }
    if (attr === "width") {
      return this.formatNumber(this.width);
    }
    if (attr === "height") {
      return this.formatNumber(this.height);
    }
    return super.getAttribute(attr);
  }

  setAttribute(attr: string, value: string): void {
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
    if (attr === "width") {
      this.width = n;
      return;
    }
    if (attr === "height") {
      this.height = n;
      return;
    }
    throw new EditorError(`unknown attribute: ${attr}`);
  }

  toTreeLine(): string {
    return `rect#${this.id}        x=${this.formatNumber(this.x)} y=${this.formatNumber(this.y)} w=${this.formatNumber(this.width)} h=${this.formatNumber(this.height)}${this.styleTreeSuffix()}`;
  }

  cloneDeep(): Rect {
    const copy = new Rect(this.id, this.x, this.y, this.width, this.height, this.fill);
    copy.stroke = this.stroke;
    copy.strokeWidth = this.strokeWidth;
    return copy;
  }

  override toSvg(indent: number): string {
    const pad = "  ".repeat(indent);
    return `${pad}<rect id="${this.escape(this.id)}" x="${this.formatNumber(this.x)}" y="${this.formatNumber(this.y)}" width="${this.formatNumber(this.width)}" height="${this.formatNumber(this.height)}"${this.styleAttributeString()}/>`;
  }

  showBody(): string {
    return `  x=${this.formatNumber(this.x)} y=${this.formatNumber(this.y)} w=${this.formatNumber(this.width)} h=${this.formatNumber(this.height)}`;
  }
}
