import type { Editor } from "../core/Editor.js";
import type { Command } from "./Command.js";

export class SetCommand implements Command {
  readonly name = "set";
  readonly kind = "edit" as const;
  private previous = "";

  constructor(
    private readonly editor: Editor,
    private readonly id: string,
    private readonly attr: string,
    private readonly value: string,
  ) {}

  execute(): string {
    const doc = this.editor.requireDocument();
    const shape = doc.ids.get(this.id);
    this.previous = shape.getAttribute(this.attr) ?? "";
    shape.setAttribute(this.attr, this.value);
    return `${shape.tagName}#${shape.id} updated: ${this.attr}="${this.value}"`;
  }

  undo(): string {
    const doc = this.editor.requireDocument();
    const shape = doc.ids.get(this.id);
    shape.setAttribute(this.attr, this.previous);
    return `${shape.tagName}#${shape.id} updated: ${this.attr}="${this.previous}"`;
  }
}
