import { EditorError } from "../core/EditorError.js";
import type { Editor } from "../core/Editor.js";
import type { Command } from "./Command.js";

export class ScaleCommand implements Command {
  readonly name = "scale";
  readonly kind = "edit" as const;

  constructor(
    private readonly editor: Editor,
    private readonly id: string,
    private readonly factor: number,
  ) {
    if (!(this.factor > 0)) {
      throw new EditorError("scale factor must be positive");
    }
  }

  execute(): string {
    const doc = this.editor.requireDocument();
    const shape = doc.ids.get(this.id);
    shape.scale(this.factor);
    return `${shape.tagName}#${shape.id} scaled by ${this.factor}`;
  }

  undo(): string {
    const doc = this.editor.requireDocument();
    const shape = doc.ids.get(this.id);
    shape.scale(1 / this.factor);
    return `${shape.tagName}#${shape.id} scaled by ${1 / this.factor}`;
  }
}
