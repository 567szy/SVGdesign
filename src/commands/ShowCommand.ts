import type { Editor } from "../core/Editor.js";
import type { Command } from "./Command.js";

export class ShowCommand implements Command {
  readonly name = "show";
  readonly kind = "query" as const;

  constructor(
    private readonly editor: Editor,
    private readonly id: string,
  ) {}

  execute(): string {
    const doc = this.editor.requireDocument();
    return doc.show(this.id);
  }

  undo(): string {
    return "";
  }
}
