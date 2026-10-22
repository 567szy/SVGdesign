import { EditorError } from "../core/EditorError.js";
import { Shape } from "../core/Shape.js";

export class Line extends Shape {
  constructor(
    id: string,
    private x1: number,
    private y1: number,
    private x2: number,
    private y2: number,
    stroke?: string,
  ) {
    super(id);
    this.stroke = stroke;
  }

  get tagName(): string {
    return "line";
  }

  move(dx: number, dy: number): void {
    this.x1 += dx;
    this.y1 += dy;
    this.x2 += dx;
    this.y2 += dy;
  }

  scale(factor: number): void {
    this.x1 *= factor;
    this.y1 *= factor;
    this.x2 *= factor;
    this.y2 *= factor;
  }

  override getAttribute(attr: string): string | undefined {
    if (attr === "x1") {
      return this.formatNumber(this.x1);
    }
    if (attr === "y1") {
      return this.formatNumber(this.y1);
    }
    if (attr === "x2") {
      return this.formatNumber(this.x2);
    }
    if (attr === "y2") {
      return this.formatNumber(this.y2);
    }
    return super.getAttribute(attr);
  }

  setAttribute(attr: string, value: string): void {
    if (this.setStyleAttribute(attr, value)) {
      return;
    }
    const n = Number(value);
    if (attr === "x1") {
      this.x1 = n;
      return;
    }
    if (attr === "y1") {
      this.y1 = n;
      return;
    }
    if (attr === "x2") {
      this.x2 = n;
      return;
    }
    if (attr === "y2") {
      this.y2 = n;
      return;
    }
    throw new EditorError(`unknown attribute: ${attr}`);
  }

  treeGeometry(): string {
    return `(${this.formatNumber(this.x1)},${this.formatNumber(this.y1)}) -> (${this.formatNumber(this.x2)},${this.formatNumber(this.y2)})`;
  }

  cloneDeep(): Line {
    const copy = new Line(this.id, this.x1, this.y1, this.x2, this.y2, this.stroke);
    copy.fill = this.fill;
    copy.strokeWidth = this.strokeWidth;
    return copy;
  }

  override toSvg(indent: number): string {
    const pad = "  ".repeat(indent);
    return `${pad}<line id="${this.escape(this.id)}" x1="${this.formatNumber(this.x1)}" y1="${this.formatNumber(this.y1)}" x2="${this.formatNumber(this.x2)}" y2="${this.formatNumber(this.y2)}"${this.styleAttributeString()}/>`;
  }
}
