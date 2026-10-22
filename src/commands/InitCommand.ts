import type { Editor } from "../core/Editor.js";
import { SvgDocument } from "../core/SvgDocument.js";
import type { Command } from "./Command.js";

export class InitCommand implements Command {
  readonly name = "init";
  readonly kind = "io" as const;

  constructor(
    private readonly editor: Editor,
    private readonly width: number,
    private readonly height: number,
  ) {}

  execute(): string {
    this.editor.replaceDocument(new SvgDocument(this.width, this.height));
    return `canvas ${this.width}x${this.height} created`;
  }

  undo(): string {
    return "";
  }
}
