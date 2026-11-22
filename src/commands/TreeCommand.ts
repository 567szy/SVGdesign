import type { Editor } from "../core/Editor.js";
import { EditorError } from "../core/EditorError.js";
import type { TreeDecorator } from "../core/Extensions.js";
import type { Command } from "./Command.js";

export class TreeCommand implements Command {
  readonly name = "tree";
  readonly kind = "query" as const;

  constructor(
    private readonly editor: Editor,
    private readonly id: string | undefined,
    private readonly decorators: ReadonlyMap<string, TreeDecorator>,
  ) {}

  execute(): string {
    const document = this.editor.requireDocument();
    return document.toTree(this.id, (shape) => {
      const labels: string[] = [];
      for (const [name, decorator] of this.decorators) {
        try {
          const label = decorator.label(document, shape);
          if (label) labels.push(label);
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          throw new EditorError(`tree decorator ${name} failed: ${reason}`);
        }
      }
      return labels.length ? " " + labels.join(" ") : "";
    });
  }

  undo(): string {
    return "";
  }
}
