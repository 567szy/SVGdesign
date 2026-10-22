import type { Editor } from "../core/Editor.js";
import { Circle } from "../shapes/Circle.js";
import { Ellipse } from "../shapes/Ellipse.js";
import { Rect } from "../shapes/Rect.js";
import { Text } from "../shapes/Text.js";
import type { Command } from "./Command.js";

export class MoveCommand implements Command {
  readonly name = "move";
  readonly kind = "edit" as const;
  private beforeLabel = "";
  private afterLabel = "";

  constructor(
    private readonly editor: Editor,
    private readonly id: string,
    private readonly dx: number,
    private readonly dy: number,
  ) {}

  execute(): string {
    const doc = this.editor.requireDocument();
    const shape = doc.ids.get(this.id);
    this.beforeLabel = this.describe(shape);
    shape.move(this.dx, this.dy);
    this.afterLabel = this.describe(shape);
    if (shape.isContainer()) {
      return `g#${shape.id} moved by (${this.dx},${this.dy})`;
    }
    return `${shape.tagName}#${shape.id} moved to ${this.afterLabel}`;
  }

  undo(): string {
    const doc = this.editor.requireDocument();
    const shape = doc.ids.get(this.id);
    shape.move(-this.dx, -this.dy);
    if (shape.isContainer()) {
      return `g#${shape.id} moved back by (${-this.dx},${-this.dy})`;
    }
    return `${shape.tagName}#${shape.id} moved back to ${this.beforeLabel}`;
  }

  private describe(shape: { tagName: string; isContainer(): boolean } & object): string {
    if (shape instanceof Circle) {
      return shape.positionLabel();
    }
    if (shape instanceof Rect || shape instanceof Ellipse || shape instanceof Text) {
      const line = shape.toTreeLine();
      const match = /\(([^)]+)\)/.exec(line);
      if (match) {
        return `(${match[1]})`;
      }
      const xy = /x=([^\s]+)\s+y=([^\s]+)/.exec(line);
      if (xy) {
        return `(${xy[1]},${xy[2]})`;
      }
    }
    return `(${this.dx},${this.dy})`;
  }
}
