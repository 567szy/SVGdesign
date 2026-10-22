import type { Group } from "./Group.js";

export abstract class Shape {
  private _parent: Group | null = null;
  protected fill?: string;
  protected stroke?: string;
  protected strokeWidth?: string;

  constructor(private readonly _id: string) {}

  get id(): string {
    return this._id;
  }

  get parent(): Group | null {
    return this._parent;
  }

  setParent(parent: Group | null): void {
    this._parent = parent;
  }

  abstract get tagName(): string;

  isContainer(): boolean {
    return false;
  }

  children(): Shape[] {
    return [];
  }

  abstract move(dx: number, dy: number): void;
  abstract scale(factor: number): void;
  abstract setAttribute(attr: string, value: string): void;

  getAttribute(attr: string): string | undefined {
    if (attr === "fill") {
      return this.fill;
    }
    if (attr === "stroke") {
      return this.stroke;
    }
    if (attr === "stroke-width") {
      return this.strokeWidth;
    }
    return undefined;
  }
  abstract toTreeLine(): string;
  abstract cloneDeep(): Shape;

  toSvg(indent: number): string {
    const pad = "  ".repeat(indent);
    return `${pad}<${this.tagName}${this.svgIdAndAttrs()}/>`;
  }

  protected svgIdAndAttrs(): string {
    const extra = this.styleAttributeString();
    return ` id="${this.escape(this._id)}"${extra}`;
  }

  protected styleAttributeString(): string {
    let out = "";
    if (this.fill !== undefined) {
      out += ` fill="${this.escape(this.fill)}"`;
    }
    if (this.stroke !== undefined) {
      out += ` stroke="${this.escape(this.stroke)}"`;
    }
    if (this.strokeWidth !== undefined) {
      out += ` stroke-width="${this.escape(this.strokeWidth)}"`;
    }
    return out;
  }

  protected setStyleAttribute(attr: string, value: string): boolean {
    if (attr === "fill") {
      this.fill = value;
      return true;
    }
    if (attr === "stroke") {
      this.stroke = value;
      return true;
    }
    if (attr === "stroke-width") {
      this.strokeWidth = value;
      return true;
    }
    return false;
  }

  protected styleTreeSuffix(): string {
    const parts: string[] = [];
    if (this.fill !== undefined) {
      parts.push(`fill=${this.fill}`);
    }
    if (this.stroke !== undefined) {
      parts.push(`stroke=${this.stroke}`);
    }
    if (this.strokeWidth !== undefined) {
      parts.push(`stroke-width=${this.strokeWidth}`);
    }
    return parts.length > 0 ? ` ${parts.join(" ")}` : "";
  }

  protected escape(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  protected formatNumber(n: number): string {
    if (Number.isInteger(n)) {
      return String(n);
    }
    return String(Number(n.toFixed(4)));
  }
}
