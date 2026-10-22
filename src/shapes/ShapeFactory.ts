import { EditorError } from "../core/EditorError.js";
import { Group } from "../core/Group.js";
import type { Shape } from "../core/Shape.js";
import { Circle } from "./Circle.js";
import { Ellipse } from "./Ellipse.js";
import { Line } from "./Line.js";
import { Rect } from "./Rect.js";
import { Text } from "./Text.js";

export interface ParsedCreate {
  type: string;
  id: string;
  containerId?: string;
  rest: string[];
}

function optionalColor(rest: string[]): string | undefined {
  if (rest.length === 0) {
    return undefined;
  }
  if (rest[0] === "in") {
    return undefined;
  }
  return rest.shift();
}

export class ShapeFactory {
  create(parsed: ParsedCreate): Shape {
    const { type, id, rest } = parsed;
    switch (type) {
      case "rect": {
        const [x, y, w, h] = this.needNumbers(type, rest, 4);
        const fill = optionalColor(rest);
        return new Rect(id, x, y, w, h, fill);
      }
      case "circle": {
        const [cx, cy, r] = this.needNumbers(type, rest, 3);
        const fill = optionalColor(rest);
        return new Circle(id, cx, cy, r, fill);
      }
      case "ellipse": {
        const [cx, cy, rx, ry] = this.needNumbers(type, rest, 4);
        const fill = optionalColor(rest);
        return new Ellipse(id, cx, cy, rx, ry, fill);
      }
      case "line": {
        const [x1, y1, x2, y2] = this.needNumbers(type, rest, 4);
        const stroke = optionalColor(rest);
        return new Line(id, x1, y1, x2, y2, stroke);
      }
      case "text": {
        const [x, y] = this.needNumbers(type, rest, 2);
        const content = rest.shift();
        if (content === undefined) {
          throw new EditorError("usage: create text <id> <x> <y> \"content\"");
        }
        return new Text(id, x, y, content);
      }
      case "g":
        return new Group(id);
      default:
        throw new EditorError(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
  }

  fromTag(
    tag: string,
    id: string,
    attrs: Record<string, string>,
    textContent: string,
  ): Shape {
    switch (tag) {
      case "rect":
        return new Rect(
          id,
          this.num(attrs.x),
          this.num(attrs.y),
          this.num(attrs.width),
          this.num(attrs.height),
          attrs.fill,
        );
      case "circle":
        return new Circle(id, this.num(attrs.cx), this.num(attrs.cy), this.num(attrs.r), attrs.fill);
      case "ellipse":
        return new Ellipse(
          id,
          this.num(attrs.cx),
          this.num(attrs.cy),
          this.num(attrs.rx),
          this.num(attrs.ry),
          attrs.fill,
        );
      case "line": {
        const line = new Line(
          id,
          this.num(attrs.x1),
          this.num(attrs.y1),
          this.num(attrs.x2),
          this.num(attrs.y2),
          attrs.stroke,
        );
        if (attrs.fill) {
          line.setAttribute("fill", attrs.fill);
        }
        return line;
      }
      case "text": {
        const text = new Text(id, this.num(attrs.x), this.num(attrs.y), textContent);
        if (attrs.fill) {
          text.setAttribute("fill", attrs.fill);
        }
        return text;
      }
      case "g":
        return new Group(id);
      default:
        throw new EditorError(`unknown shape type: ${tag} (is the plugin loaded?)`);
    }
  }

  applyCommonStyle(shape: Shape, attrs: Record<string, string>): void {
    if (attrs.fill && shape.tagName !== "rect" && shape.tagName !== "circle" && shape.tagName !== "ellipse") {
      try {
        shape.setAttribute("fill", attrs.fill);
      } catch {
        /* ignore */
      }
    }
    if (attrs.stroke && shape.tagName !== "line") {
      try {
        shape.setAttribute("stroke", attrs.stroke);
      } catch {
        /* ignore */
      }
    }
    if (attrs["stroke-width"]) {
      shape.setAttribute("stroke-width", attrs["stroke-width"]);
    }
  }

  private needNumbers(type: string, rest: string[], count: number): number[] {
    const values: number[] = [];
    for (let i = 0; i < count; i += 1) {
      const raw = rest.shift();
      if (raw === undefined || Number.isNaN(Number(raw))) {
        throw new EditorError(`usage: create ${type} …`);
      }
      values.push(Number(raw));
    }
    return values;
  }

  private num(raw: string | undefined): number {
    if (raw === undefined || raw === "") {
      return 0;
    }
    return Number(raw);
  }
}
