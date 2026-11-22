import type { Command } from "../../src/commands/Command.js";
import { EditorError } from "../../src/core/EditorError.js";
import type { Plugin, PluginContext } from "../../src/core/Extensions.js";
import type { SvgDocument } from "../../src/core/SvgDocument.js";

export class StatsCommand implements Command {
  readonly name = "stats";
  readonly kind = "query";

  constructor(private readonly getDocument: () => SvgDocument | null) {}

  execute(): string {
    const document = this.getDocument();
    if (!document) throw new EditorError("no document. use 'init' or 'read' first");
    const counts = new Map<string, number>();
    let total = 0;
    let containers = 0;
    const pending = [...document.children].reverse();
    while (pending.length) {
      const shape = pending.pop()!;
      if (shape.isContainer()) {
        containers++;
        const children = shape.children();
        for (let index = children.length - 1; index >= 0; index--) {
          pending.push(children[index]);
        }
      } else {
        total++;
        counts.set(shape.type, (counts.get(shape.type) ?? 0) + 1);
      }
    }
    const entries = Array.from(counts, ([type, count]) => `${type}: ${count}`);
    return [...entries, `(total ${total}, containers ${containers})`].join("  ");
  }

  undo(): string {
    return "";
  }
}

class StatsPlugin implements Plugin {
  activate(context: PluginContext): void {
    context.register("commands", "stats", {
      help: "stats",
      create: (args) => {
        if (args.length) throw new EditorError("usage: stats");
        return new StatsCommand(() => context.getDocument());
      },
    });
  }
}

export default new StatsPlugin();
