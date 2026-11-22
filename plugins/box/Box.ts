import { EditorError } from "../../src/core/EditorError.js";
import { Group } from "../../src/core/Group.js";
import type { Shape } from "../../src/core/Shape.js";
import { Rect } from "../../src/shapes/Rect.js";
import { Text } from "../../src/shapes/Text.js";

export type BoxPart = "rect" | "label";

export function partId(id: string, part: BoxPart): string {
  return `${id}-${part}`;
}

export class Box extends Group {
  override get type(): string {
    return "box";
  }

  override describeCreation(containerId?: string): string {
    return `${super.describeCreation(containerId)} (g#${this.id} + rect#${partId(this.id, "rect")} + text#${partId(this.id, "label")})`;
  }

  validateParts(): void {
    const children = this.children();
    const frame = children.find((child) => child.id === partId(this.id, "rect"));
    const label = children.find((child) => child.id === partId(this.id, "label"));
    if (!(frame instanceof Rect) || !(label instanceof Text)) {
      throw new EditorError(`invalid box: ${this.id} requires rect#${partId(this.id, "rect")} and text#${partId(this.id, "label")}`);
    }
  }

  override assertCanUngroup(): void {
    throw new EditorError(`cannot ungroup composite shape: ${this.id}`);
  }

  override assertCanRemoveChild(shape: Shape): void {
    if (shape.id === partId(this.id, "rect") || shape.id === partId(this.id, "label")) {
      throw new EditorError(`cannot remove required box part: ${shape.id}`);
    }
  }

  override cloneDeep(): Box {
    const copy = new Box(this.id);
    copy.fill = this.fill;
    copy.stroke = this.stroke;
    copy.strokeWidth = this.strokeWidth;
    for (const child of this.children()) copy.addChild(child.cloneDeep());
    return copy;
  }

  protected override svgIdAndAttrs(): string {
    return `${super.svgIdAndAttrs()} data-kind="box"`;
  }
}
