import { EditorError } from "../core/EditorError.js";
import type { Extensions, ShapeProvider } from "../core/Extensions.js";
import { Group } from "../core/Group.js";
import type { Shape } from "../core/Shape.js";
import { Circle } from "../shapes/Circle.js";
import { Ellipse } from "../shapes/Ellipse.js";
import { Line } from "../shapes/Line.js";
import { Rect } from "../shapes/Rect.js";
import { Text } from "../shapes/Text.js";

class BuiltinShapeProvider implements ShapeProvider {
  constructor(
    readonly name: string,
    readonly create: ShapeProvider["create"],
    readonly read: ShapeProvider["read"],
  ) {}

  get svgTag(): string {
    return this.name;
  }
}

function numbers(type: string, args: string[], count: number): number[] {
  const values: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const raw = args[i];
    if (raw === undefined || Number.isNaN(Number(raw))) {
      throw new EditorError(`usage: create ${type} …`);
    }
    values.push(Number(raw));
  }
  return values;
}

function color(value?: string): string | undefined {
  return value === "in" ? undefined : value;
}

function fill<T extends Shape>(shape: T, value?: string): T {
  if (value) shape.setAttribute("fill", value);
  return shape;
}

export function registerBuiltinShapes(extensions: Extensions): void {
  const providers = [
    new BuiltinShapeProvider("rect", (id, args) => {
      const [x, y, w, h] = numbers("rect", args, 4);
      return new Rect(id, x, y, w, h, color(args[4]));
    }, (id, a) => new Rect(id, Number(a.x ?? 0), Number(a.y ?? 0),
      Number(a.width ?? 0), Number(a.height ?? 0), a.fill)),
    new BuiltinShapeProvider("circle", (id, args) => {
      const [cx, cy, r] = numbers("circle", args, 3);
      return new Circle(id, cx, cy, r, color(args[3]));
    }, (id, a) => new Circle(id, Number(a.cx ?? 0), Number(a.cy ?? 0), Number(a.r ?? 0), a.fill)),
    new BuiltinShapeProvider("ellipse", (id, args) => {
      const [cx, cy, rx, ry] = numbers("ellipse", args, 4);
      return new Ellipse(id, cx, cy, rx, ry, color(args[4]));
    }, (id, a) => new Ellipse(id, Number(a.cx ?? 0), Number(a.cy ?? 0),
      Number(a.rx ?? 0), Number(a.ry ?? 0), a.fill)),
    new BuiltinShapeProvider("line", (id, args) => {
      const [x1, y1, x2, y2] = numbers("line", args, 4);
      return new Line(id, x1, y1, x2, y2, color(args[4]));
    }, (id, a) => fill(new Line(id, Number(a.x1 ?? 0), Number(a.y1 ?? 0),
      Number(a.x2 ?? 0), Number(a.y2 ?? 0), a.stroke), a.fill)),
    new BuiltinShapeProvider("text", (id, args) => {
      const [x, y] = numbers("text", args, 2);
      const content = args[2];
      if (content === undefined) {
        throw new EditorError('usage: create text <id> <x> <y> "content"');
      }
      return new Text(id, x, y, content);
    }, (id, a, text) => fill(new Text(id, Number(a.x ?? 0), Number(a.y ?? 0), text), a.fill)),
    new BuiltinShapeProvider("g", (id) => new Group(id), (id) => new Group(id)),
  ];
  for (const provider of providers) extensions.register("shapes", provider.name, provider);
}
