import type { Editor } from "../core/Editor.js";
import { EditorError } from "../core/EditorError.js";
import type { AttributeHandler, AttributeMessages, AttributeTarget } from "../core/Extensions.js";
import type { Shape } from "../core/Shape.js";
import type { SvgDocument } from "../core/SvgDocument.js";
import type { Command } from "./Command.js";

interface Write {
  id: string;
  attribute: string;
  value: string;
}

interface AppliedWrite extends Write {
  previous?: string;
}

interface Plan {
  writes: Write[];
  messages: AttributeMessages | undefined;
}

export class SetCommand implements Command {
  readonly name = "set";
  readonly kind = "edit" as const;
  private previous = "";
  private planned?: Plan;
  private applied: AppliedWrite[] = [];

  constructor(
    private readonly editor: Editor,
    private readonly id: string,
    private readonly attr: string,
    private readonly value: string,
    private readonly handlers: ReadonlyMap<string, AttributeHandler>,
  ) {}

  execute(): string {
    const doc = this.editor.requireDocument();
    const shape = doc.ids.get(this.id);
    const planned = this.planned ?? this.plan(shape);
    if (planned) {
      this.applied = this.apply(doc, planned.writes);
      this.planned = planned;
      this.previous = this.applied[0]?.previous ?? "";
    } else {
      this.previous = shape.getAttribute(this.attr) ?? "";
      shape.setAttribute(this.attr, this.value);
    }
    return planned?.messages?.applied ?? this.summary(shape, this.value);
  }

  undo(): string {
    const doc = this.editor.requireDocument();
    const shape = doc.ids.get(this.id);
    if (this.planned) {
      this.restore(doc, this.applied);
    } else {
      shape.setAttribute(this.attr, this.previous);
    }
    return this.planned?.messages?.undone ?? this.summary(shape, this.previous);
  }

  private plan(shape: Shape): Plan | undefined {
    if (this.handlers.size === 0) return;
    const targets = new Map<AttributeTarget, string>();
    const view = (node: Shape): AttributeTarget => {
      const target = Object.freeze({
        id: node.id,
        type: node.type,
        children: Object.freeze(node.children().map(view)),
        getAttribute: (attribute: string) => node.getAttribute(attribute),
      });
      targets.set(target, node.id);
      return target;
    };
    const target = view(shape);
    const matches = [...this.handlers.values()].filter((handler) => handler.handles(target, this.attr));
    if (matches.length === 0) return;
    if (matches.length > 1) throw new EditorError(`conflicting attribute handlers: ${this.attr}`);

    const writes: Write[] = [];
    const messages = matches[0].apply(target, this.attr, this.value, (destination, attribute, value) => {
      const id = targets.get(destination);
      if (id === undefined) throw new EditorError("attribute handler target is outside the selected shape");
      writes.push({ id, attribute, value });
    });
    return { writes: [...writes], messages: messages ? { ...messages } : undefined };
  }

  private apply(document: SvgDocument, writes: Write[]): AppliedWrite[] {
    const applied: AppliedWrite[] = [];
    try {
      for (const write of writes) {
        const target = document.ids.get(write.id);
        applied.push({ ...write, previous: target.getAttribute(write.attribute) });
        target.setAttribute(write.attribute, write.value);
      }
      return applied;
    } catch (error) {
      this.restore(document, applied);
      throw error;
    }
  }

  private restore(document: SvgDocument, writes: AppliedWrite[]): void {
    for (const write of [...writes].reverse()) {
      document.ids.get(write.id).restoreAttribute(write.attribute, write.previous);
    }
  }

  private summary(shape: Shape, value: string): string {
    return `${shape.tagName}#${shape.id} updated: ${this.attr}="${value}"`;
  }
}
