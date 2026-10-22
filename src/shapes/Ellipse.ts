import { EditorError } from "../core/EditorError.js";
import { Shape } from "../core/Shape.js";

export class Ellipse extends Shape {
  constructor(
    id: string,
    private cx: number,
    private cy: number,
    private rx: number,
    private ry: number,
    fill?: string,
  ) {
    super(id);
    this.fill = fill;
  }

  get tagName(): string {
    return "ellipse";
  }

  move(dx: number, dy: number): void {
    this.cx += dx;
    this.cy += dy;
  }

  scale(factor: number): void {
    this.cx *= factor;
    this.cy *= factor;
    this.rx *= factor;
    this.ry *= factor;
  }

  override getAttribute(attr: string): string | undefined {
    if (attr === "cx") {
      return this.formatNumber(this.cx);
    }
    if (attr === "cy") {
      return this.formatNumber(this.cy);
    }
    if (attr === "rx") {
      return this.formatNumber(this.rx);
    }
    if (attr === "ry") {
      return this.formatNumber(this.ry);
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
    if (attr === "rx") {
      this.rx = n;
      return;
    }
    if (attr === "ry") {
      this.ry = n;
      return;
    }
    throw new EditorError(`unknown attribute: ${attr}`);
  }

  toTreeLine(): string {
    return `ellipse#${this.id}     cx=${this.formatNumber(this.cx)} cy=${this.formatNumber(this.cy)} rx=${this.formatNumber(this.rx)} ry=${this.formatNumber(this.ry)}${this.styleTreeSuffix()}`;
  }

  cloneDeep(): Ellipse {
    const copy = new Ellipse(this.id, this.cx, this.cy, this.rx, this.ry, this.fill);
    copy.stroke = this.stroke;
    copy.strokeWidth = this.strokeWidth;
    return copy;
  }

  override toSvg(indent: number): string {
    const pad = "  ".repeat(indent);
    return `${pad}<ellipse id="${this.escape(this.id)}" cx="${this.formatNumber(this.cx)}" cy="${this.formatNumber(this.cy)}" rx="${this.formatNumber(this.rx)}" ry="${this.formatNumber(this.ry)}"${this.styleAttributeString()}/>`;
  }

  showBody(): string {
    return `  cx=${this.formatNumber(this.cx)} cy=${this.formatNumber(this.cy)} rx=${this.formatNumber(this.rx)} ry=${this.formatNumber(this.ry)}`;
  }
}
