import type { Editor } from "../core/Editor.js";
import type { Group } from "../core/Group.js";
import type { Shape } from "../core/Shape.js";
import type { Command } from "./Command.js";

export class ZOrderCommand implements Command {
  readonly name: string;
  readonly kind = "edit" as const;
  private oldParent?: Group;
  private oldIndex = 0;
  private shape?: Shape;

  constructor(
    private readonly editor: Editor,
    private readonly id: string,
    private readonly toFront: boolean,
  ) {
    this.name = toFront ? "front" : "back";
  }

  execute(): string {
    const doc = this.editor.requireDocument();
    const shape = doc.ids.get(this.id);
    const loc = doc.detach(shape);
    this.shape = shape;
    this.oldParent = loc.parent;
    this.oldIndex = loc.index;
    if (this.oldParent) {
      if (this.toFront) {
        this.oldParent.addChild(shape);
      } else {
        this.oldParent.addChild(shape, 0);
      }
    } else if (this.toFront) {
      doc.attach(shape);
    } else {
      doc.attach(shape, undefined, 0);
    }
    return `${shape.tagName}#${shape.id} sent to ${this.toFront ? "front" : "back"}`;
  }

  undo(): string {
    const doc = this.editor.requireDocument();
    if (!this.shape) {
      return "";
    }
    doc.detach(this.shape);
    doc.attach(this.shape, this.oldParent, this.oldIndex);
    return `${this.shape.tagName}#${this.shape.id} z-order restored`;
  }
}
