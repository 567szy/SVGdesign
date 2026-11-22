import { SaxesParser } from "saxes";

export interface SvgElement {
  name: string;
  start: number;
  nameEnd: number;
  end: number;
  children: SvgElement[];
}

export function parseSvgOutline(source: string): SvgElement[] {
  const parser = new SaxesParser();
  const roots: SvgElement[] = [];
  const stack: SvgElement[] = [];
  let start = 0;
  let invalid = false;

  parser.on("error", () => { invalid = true; });
  parser.on("opentagstart", () => {
    start = source.lastIndexOf("<", parser.position - 1);
  });
  parser.on("opentag", tag => {
    const id = tag.attributes.id;
    const element: SvgElement = {
      name: id ? `${tag.name}#${id}` : tag.name,
      start,
      nameEnd: start + 1 + tag.name.length,
      end: parser.position,
      children: [],
    };
    (stack.at(-1)?.children ?? roots).push(element);
    stack.push(element);
  });
  parser.on("closetag", () => {
    const element = stack.pop();
    if (element) element.end = parser.position;
  });
  parser.write(source).close();
  return invalid ? [] : roots;
}
