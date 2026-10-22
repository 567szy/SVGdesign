import { EditorError } from "../core/EditorError.js";
import { Shape } from "../core/Shape.js";

export class Circle extends Shape {
  constructor(
    id: string,
    private cx: number,
    private cy: number,
    private r: number,
    fill?: string,
  ) {
    super(id);
    this.fill = fill;
  }

  get tagName(): string {
    return "circle";
  }

  move(dx: number, dy: number): void {
    this.cx += dx;
    this.cy += dy;
  }

  scale(factor: number): void {
    this.cx *= factor;
    this.cy *= factor;
    this.r *= factor;
  }

  override getAttribute(attr: string): string | undefined {
    if (attr === "cx") {
      return this.formatNumber(this.cx);
    }
    if (attr === "cy") {
      return this.formatNumber(this.cy);
    }
    if (attr === "r") {
      return this.formatNumber(this.r);
    }
    return super.getAttribute(attr);
  }

  setAttribute(attr: string, value: string): void {
    if (this.setStyleAttribute(attr, value)) {
      return;
    }
    const n = Number(value);
    if (attr === "cx") {
      this.cx = n;
      return;
    }
    if (attr === "cy") {
      this.cy = n;
      return;
    }
    if (attr === "r") {
      this.r = n;
      return;
    }
    throw new EditorError(`unknown attribute: ${attr}`);
  }

  treeGeometry(): string {
    return `cx=${this.formatNumber(this.cx)} cy=${this.formatNumber(this.cy)} r=${this.formatNumber(this.r)}`;
  }

  cloneDeep(): Circle {
    const copy = new Circle(this.id, this.cx, this.cy, this.r, this.fill);
    copy.stroke = this.stroke;
    copy.strokeWidth = this.strokeWidth;
    return copy;
  }

  override toSvg(indent: number): string {
    const pad = "  ".repeat(indent);
    return `${pad}<circle id="${this.escape(this.id)}" cx="${this.formatNumber(this.cx)}" cy="${this.formatNumber(this.cy)}" r="${this.formatNumber(this.r)}"${this.styleAttributeString()}/>`;
  }

  positionLabel(): string {
    return `(${this.formatNumber(this.cx)},${this.formatNumber(this.cy)})`;
  }
}
