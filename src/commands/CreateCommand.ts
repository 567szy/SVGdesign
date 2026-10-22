import type { Editor } from "../core/Editor.js";
import type { Group } from "../core/Group.js";
import type { Shape } from "../core/Shape.js";
import { ShapeFactory } from "../shapes/ShapeFactory.js";
import type { Command } from "./Command.js";

export class CreateCommand implements Command {
  readonly name = "create";
  readonly kind = "edit" as const;
  private created?: Shape;

  constructor(
    private readonly editor: Editor,
    private readonly factory: ShapeFactory,
    private readonly type: string,
    private readonly id: string,
    private readonly args: string[],
    private readonly containerId?: string,
  ) {}

  execute(): string {
    const doc = this.editor.requireDocument();
    const shape = this.factory.create({
      type: this.type,
      id: this.id,
      containerId: this.containerId,
      rest: [...this.args],
    });
    doc.add(shape, this.containerId);
    this.created = shape;
    if (this.containerId) {
      return `${shape.tagName}#${shape.id} created in g#${this.containerId}`;
    }
    return `${shape.tagName}#${shape.id} created`;
  }

  undo(): string {
    if (!this.created) {
      return "";
    }
    const doc = this.editor.requireDocument();
    doc.delete(this.created);
    const id = this.created.id;
    const tag = this.created.tagName;
    this.created = undefined;
    return `${tag}#${id} deleted`;
  }

  get parentHint(): Group | undefined {
    return this.created?.parent ?? undefined;
  }
}
