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
    const shape = doc.ids.get(this.id);
    const parent = shape.parent ? `g#${shape.parent.id}` : "svg";
    const lines = [`${shape.tagName}#${shape.id}  parent=${parent}`];
    const treeLine = shape.toTreeLine();
    const detail = treeLine.replace(new RegExp(`^${shape.tagName}#${shape.id}\\s*`), "").trim();
    if (detail) {
      lines.push(`  ${detail}`);
    }
    return lines.join("\n");
  }

  undo(): string {
    return "";
  }
}
