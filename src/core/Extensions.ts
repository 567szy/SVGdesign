import type { CommandRegistration } from "../commands/Command.js";
import { EditorError } from "./EditorError.js";
import type { Shape } from "./Shape.js";
import type { SvgDocument } from "./SvgDocument.js";

export interface ShapeProvider {
  readonly name: string;
  readonly svgTag: string;
  create(id: string, args: string[]): Shape;
  read(id: string, attributes: Readonly<Record<string, string>>, text: string): Shape;
  finishRead?(shape: Shape): void;
}

export interface AttributeTarget {
  readonly id: string;
  readonly type: string;
  readonly children: readonly AttributeTarget[];
  getAttribute(attribute: string): string | undefined;
}

export interface AttributeMessages {
  readonly applied: string;
  readonly undone: string;
}

export interface AttributeHandler {
  handles(target: AttributeTarget, attribute: string): boolean;
  apply(
    target: AttributeTarget, attribute: string, value: string,
    set: (target: AttributeTarget, attribute: string, value: string) => void,
  ): void | AttributeMessages;
}

export interface TreeDecorator {
  label(document: SvgDocument, shape?: Shape): string | undefined;
  onSaved?(document: SvgDocument): void;
}

interface Contributions {
  shapes: ShapeProvider;
  commands: CommandRegistration;
  decorators: TreeDecorator;
  attributes: AttributeHandler;
}

export type Category = keyof Contributions;
export const categories: readonly Category[] = ["shapes", "commands", "decorators", "attributes"];

export interface PluginContext {
  getDocument(): SvgDocument | null;
  register<K extends Category>(category: K, name: string, implementation: Contributions[K]): void;
}

export interface Plugin {
  activate(context: PluginContext, options: unknown): void | Promise<void>;
}

export class Extensions {
  private readonly registries: { [K in Category]: Map<string, Contributions[K]> } = {
    shapes: new Map(),
    commands: new Map(),
    decorators: new Map(),
    attributes: new Map(),
  };

  get shapes(): ReadonlyMap<string, ShapeProvider> { return this.registries.shapes; }
  get commands(): ReadonlyMap<string, CommandRegistration> { return this.registries.commands; }
  get decorators(): ReadonlyMap<string, TreeDecorator> { return this.registries.decorators; }
  get attributes(): ReadonlyMap<string, AttributeHandler> { return this.registries.attributes; }

  register<K extends Category>(category: K, name: string, implementation: Contributions[K]): void {
    const registry = this.registries[category];
    if (registry.has(name)) {
      throw new EditorError(`duplicate registration: ${category}/${name}`);
    }
    const shape = implementation as ShapeProvider;
    if (category === "shapes" && shape?.name !== name) {
      throw new EditorError(`shape provider name mismatch: ${name}`);
    }
    const required = {
      shapes: ["create", "read"],
      commands: ["create"],
      decorators: ["label"],
      attributes: ["handles", "apply"],
    };
    const candidate = implementation as unknown as Record<string, unknown> | null;
    if (!candidate || required[category].some((method) => typeof candidate[method] !== "function")
      || (category === "commands" && typeof candidate.help !== "string")
      || (category === "shapes" && typeof candidate.svgTag !== "string")) {
      throw new EditorError(`invalid registration: ${category}/${name}`);
    }
    registry.set(name, implementation);
  }

  merge(staged: Extensions): void {
    for (const category of categories) {
      for (const name of staged[category].keys()) {
        if (this[category].has(name)) {
          throw new EditorError(`duplicate registration: ${category}/${name}`);
        }
      }
    }
    for (const category of categories) {
      this.mergeCategory(category, staged);
    }
  }

  private mergeCategory<K extends Category>(category: K, staged: Extensions): void {
    for (const [name, implementation] of staged.registries[category]) {
      this.registries[category].set(name, implementation);
    }
  }
}
