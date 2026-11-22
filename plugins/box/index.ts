import { EditorError } from "../../src/core/EditorError.js";
import type {
  AttributeHandler, AttributeMessages, AttributeTarget, Plugin, PluginContext, ShapeProvider, TreeDecorator,
} from "../../src/core/Extensions.js";
import type { Shape } from "../../src/core/Shape.js";
import type { SvgDocument } from "../../src/core/SvgDocument.js";
import { Rect } from "../../src/shapes/Rect.js";
import { Text } from "../../src/shapes/Text.js";
import { Box, partId } from "./Box.js";

export class BoxProvider implements ShapeProvider {
  readonly name = "box";
  readonly svgTag = "g";

  create(id: string, args: string[]): Box {
    const [x, y, width, height] = args.slice(0, 4).map(Number);
    if (args.length !== 5 || ![x, y, width, height].every(Number.isFinite)) {
      throw new EditorError('usage: create box <id> <x> <y> <w> <h> "<title>"');
    }
    const box = new Box(id);
    box.addChild(new Rect(partId(id, "rect"), x, y, width, height, "#4a90d9"));
    box.addChild(new Text(partId(id, "label"), x + width / 8, y + height / 2 + 5, args[4]));
    return box;
  }

  read(id: string): Box {
    return new Box(id);
  }

  finishRead(shape: Box): void {
    shape.validateParts();
  }
}

export class BoxAttributeHandler implements AttributeHandler {
  handles(target: AttributeTarget, attribute: string): boolean {
    return target.type === "box" && (attribute === "fill" || attribute === "label");
  }

  apply(
    target: AttributeTarget, attribute: string, value: string,
    set: (target: AttributeTarget, attribute: string, value: string) => void,
  ): AttributeMessages {
    const isFill = attribute === "fill";
    const id = partId(target.id, isFill ? "rect" : "label");
    const part = target.children.find((child) => child.id === id);
    if (!part) throw new EditorError(`invalid box: ${target.id} missing ${id}`);
    const label = `box#${target.id}`;
    set(part, isFill ? "fill" : "text", value);
    return isFill
      ? { applied: `${label} fill propagated to ${id}`, undone: `${label} fill restored on ${id}` }
      : { applied: `${label} label updated: "${value}"`, undone: `${label} label restored: "${part.getAttribute("text") ?? ""}"` };
  }
}

class BoxTypeLabel implements TreeDecorator {
  label(_document: SvgDocument, shape?: Shape): string | undefined {
    return shape?.type === "box" ? "(box)" : undefined;
  }
}

class BoxPlugin implements Plugin {
  activate(context: PluginContext): void {
    context.register("shapes", "box", new BoxProvider());
    context.register("attributes", "box-attributes", new BoxAttributeHandler());
    context.register("decorators", "box-type-label", new BoxTypeLabel());
  }
}

export default new BoxPlugin();
