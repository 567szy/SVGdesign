import type { Editor } from "../core/Editor.js";
import type { Group } from "../core/Group.js";
import type { Shape } from "../core/Shape.js";
import type { Command } from "./Command.js";

export class DeleteCommand implements Command {
  readonly name = "delete";
  readonly kind = "edit" as const;
  private removed?: Shape;
  private parent?: Group;
  private index = 0;

  constructor(
    private readonly editor: Editor,
    private readonly id: string,
  ) {}

  execute(): string {
    const doc = this.editor.requireDocument();
    const shape = doc.ids.get(this.id);
    const location = doc.delete(shape);
    this.removed = shape;
    this.parent = location.parent;
    this.index = location.index;
    return `${shape.tagName}#${shape.id} deleted`;
  }

  undo(): string {
    if (!this.removed) {
      return "";
    }
    const doc = this.editor.requireDocument();
    doc.restore(this.removed, this.parent, this.index);
    const shape = this.removed;
    this.removed = undefined;
    const parentLabel = this.parent ? `g#${this.parent.id}` : "svg";
    return `${shape.tagName}#${shape.id} restored into ${parentLabel}`;
  }
}
