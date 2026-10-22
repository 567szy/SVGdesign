import type { Editor } from "../core/Editor.js";
import type { Command } from "./Command.js";

export class TreeCommand implements Command {
  readonly name = "tree";
  readonly kind = "query" as const;

  constructor(
    private readonly editor: Editor,
    private readonly id?: string,
  ) {}

  execute(): string {
    return this.editor.requireDocument().toTree(this.id);
  }

  undo(): string {
    return "";
  }
}
