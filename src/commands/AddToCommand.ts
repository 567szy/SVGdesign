import { EditorError } from "../core/EditorError.js";
import type { Editor } from "../core/Editor.js";
import { Group } from "../core/Group.js";
import type { Shape } from "../core/Shape.js";
import type { Command } from "./Command.js";

export class AddToCommand implements Command {
  readonly name = "addto";
  readonly kind = "edit" as const;
  private shape?: Shape;
  private oldParent?: Group;
  private oldIndex = 0;

  constructor(
    private readonly editor: Editor,
    private readonly gid: string,
    private readonly id: string,
  ) {}

  execute(): string {
    const doc = this.editor.requireDocument();
    const container = doc.requireContainer(this.gid);
    const shape = doc.ids.get(this.id);
    if (shape === container || (shape instanceof Group && shape.contains(container))) {
      throw new EditorError(`cannot group a container into its own descendant: ${shape.id}`);
    }
    const loc = doc.detach(shape);
    this.shape = shape;
    this.oldParent = loc.parent;
    this.oldIndex = loc.index;
    container.addChild(shape);
    return `${shape.tagName}#${shape.id} moved into g#${container.id}`;
  }

  undo(): string {
    const doc = this.editor.requireDocument();
    if (!this.shape) {
      return "";
    }
    doc.detach(this.shape);
    doc.attach(this.shape, this.oldParent, this.oldIndex);
    return `${this.shape.tagName}#${this.shape.id} restored`;
  }
}
