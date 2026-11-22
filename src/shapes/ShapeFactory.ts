import { EditorError } from "../core/EditorError.js";
import type { ShapeProvider } from "../core/Extensions.js";

export class ShapeFactory {
  constructor(private readonly providers: ReadonlyMap<string, ShapeProvider>) {}

  create(type: string, id: string, args: string[]) {
    return this.requireProvider(type).create(id, args);
  }

  forRead(tag: string, kind?: string): ShapeProvider {
    const candidate = kind && this.providers.get(kind);
    return candidate && candidate.svgTag === tag ? candidate : this.requireProvider(tag);
  }

  private requireProvider(name: string): ShapeProvider {
    const provider = this.providers.get(name);
    if (!provider) throw new EditorError(`unknown shape type: ${name} (is the plugin loaded?)`);
    return provider;
  }
}
