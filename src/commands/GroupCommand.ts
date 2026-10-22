import { EditorError } from "../core/EditorError.js";
import type { Editor } from "../core/Editor.js";
import { Group } from "../core/Group.js";
import type { Shape } from "../core/Shape.js";
import type { Command } from "./Command.js";

interface MemberLocation {
  shape: Shape;
  parent?: Group;
  index: number;
}

export class GroupCommand implements Command {
  readonly name = "group";
  readonly kind = "edit" as const;
  private created?: Group;
  private locations: MemberLocation[] = [];

  constructor(
    private readonly editor: Editor,
    private readonly newGid: string,
    private readonly memberIds: string[],
  ) {}

  execute(): string {
    const doc = this.editor.requireDocument();
    const members = this.memberIds.map((id) => doc.ids.get(id));
    this.assertNoContainerWithDescendant(members);
    this.locations = members.map((shape) => {
      const { parent, index } = doc.detach(shape);
      return { shape, parent, index };
    });
    const group = new Group(this.newGid);
    doc.add(group);
    for (const member of members) {
      group.addChild(member);
    }
    this.created = group;
    return `g#${group.id} created with ${members.length} children`;
  }

  undo(): string {
    const doc = this.editor.requireDocument();
    if (!this.created) {
      return "";
    }
    const children = this.created.takeChildren();
    const loc = doc.detach(this.created);
    doc.ids.unregisterSelf(this.created);
    void loc;
    for (const item of [...this.locations].reverse()) {
      doc.attach(item.shape, item.parent, item.index);
    }
    const id = this.created.id;
    this.created = undefined;
    this.locations = [];
    void children;
    return `g#${id} dissolved`;
  }

  private assertNoContainerWithDescendant(members: Shape[]): void {
    for (const a of members) {
      if (!(a instanceof Group)) {
        continue;
      }
      for (const b of members) {
        if (a !== b && a.contains(b)) {
          throw new EditorError(`cannot group a container into its own descendant: ${a.id}`);
        }
      }
    }
  }
}
