import { EditorError } from "../core/EditorError.js";
import type { Editor } from "../core/Editor.js";
import { Group } from "../core/Group.js";
import type { Shape } from "../core/Shape.js";
import type { Command } from "./Command.js";

export class UngroupCommand implements Command {
  readonly name = "ungroup";
  readonly kind = "edit" as const;
  private group?: Group;
  private parent?: Group;
  private index = 0;
  private children: Shape[] = [];

  constructor(
    private readonly editor: Editor,
    private readonly gid: string,
  ) {}

  execute(): string {
    const doc = this.editor.requireDocument();
    const shape = doc.ids.get(this.gid);
    if (!(shape instanceof Group)) {
      throw new EditorError(`not a container: ${this.gid}`);
    }
    if (doc.isTopLevel(shape) || !shape.parent) {
      throw new EditorError(`cannot ungroup top-level container: ${this.gid}`);
    }
    const parent = shape.parent;
    this.group = shape;
    this.parent = parent;
    this.index = parent.indexOf(shape);
    this.children = shape.takeChildren();
    parent.removeChild(shape);
    doc.ids.unregisterSelf(shape);
    let insertAt = this.index;
    for (const child of this.children) {
      parent.addChild(child, insertAt);
      insertAt += 1;
    }
    return `g#${this.gid} ungrouped`;
  }

  undo(): string {
    const doc = this.editor.requireDocument();
    if (!this.group || !this.parent) {
      return "";
    }
    const first = this.children[0];
    const insertAt = first ? this.parent.indexOf(first) : this.index;
    for (const child of this.children) {
      this.parent.removeChild(child);
    }
    for (const child of this.children) {
      this.group.addChild(child);
    }
    doc.ids.register(this.group);
    doc.attach(this.group, this.parent, insertAt);
    return `g#${this.group.id} restored`;
  }
}
