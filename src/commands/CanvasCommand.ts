import type { Editor } from "../core/Editor.js";
import type { Command, CommandKind } from "./Command.js";

export class CanvasCommand implements Command {
  readonly name = "canvas";
  readonly kind: CommandKind;
  private readonly width?: number;
  private readonly height?: number;

  constructor(private readonly editor: Editor, width?: number, height?: number) {
    this.width = width;
    this.height = height;
    this.kind = width !== undefined && height !== undefined ? "io" : "query";
  }

  execute(): string {
    const doc = this.editor.requireDocument();
    if (this.width === undefined || this.height === undefined) {
      return `${doc.width}x${doc.height}`;
    }
    doc.width = this.width;
    doc.height = this.height;
    return `canvas ${doc.width}x${doc.height}`;
  }

  undo(): string {
    return "";
  }
}
