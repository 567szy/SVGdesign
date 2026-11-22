import type { Plugin, PluginContext, TreeDecorator } from "../../src/core/Extensions.js";
import type { Shape } from "../../src/core/Shape.js";
import type { SvgDocument } from "../../src/core/SvgDocument.js";

interface SavedState {
  svg: string;
  rows: ReadonlyMap<string, string>;
}

export class ModifiedStar implements TreeDecorator {
  private readonly saved = new WeakMap<SvgDocument, SavedState>();

  onSaved(document: SvgDocument): void {
    const rows = new Map<string, string>();
    const pending = [...document.children];
    while (pending.length) {
      const shape = pending.pop()!;
      rows.set(shape.id, this.signature(shape));
      for (const child of shape.children()) pending.push(child);
    }
    this.saved.set(document, { svg: document.toSvg(), rows });
  }

  label(document: SvgDocument, shape?: Shape): string | undefined {
    const checkpoint = this.saved.get(document);
    const changed = shape
      ? checkpoint?.rows.get(shape.id) !== this.signature(shape)
      : checkpoint?.svg !== document.toSvg();
    return changed ? "*" : undefined;
  }

  private signature(shape: Shape): string {
    return JSON.stringify([
      shape.type, shape.toTreeLine(), shape.parent?.id, shape.children().map((child) => child.id),
    ]);
  }
}

class ModifiedStarPlugin implements Plugin {
  activate(context: PluginContext): void {
    context.register("decorators", "modified-star", new ModifiedStar());
  }
}

export default new ModifiedStarPlugin();
