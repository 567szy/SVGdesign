import { EditorError } from "../core/EditorError.js";
import { Group } from "../core/Group.js";
import { SvgDocument } from "../core/SvgDocument.js";
import type { Shape } from "../core/Shape.js";
import { ShapeFactory } from "../shapes/ShapeFactory.js";
import { findUnsupportedTransforms, parseTransform } from "./Transform.js";

interface XmlNode {
  tag: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  text: string;
}

export class SvgReader {
  constructor(private readonly factory: ShapeFactory) {}

  parse(xml: string): { document: SvgDocument; warnings: string[] } {
    const warnings: string[] = [];
    const root = this.parseRoot(xml);
    const width = Number(root.attrs.width ?? "800");
    const height = Number(root.attrs.height ?? "600");
    const document = new SvgDocument(width, height);
    const transformed: { shape: Shape; dx: number; dy: number; scale: number }[] = [];
    for (const child of root.children) {
      document.add(this.toShape(child, document, warnings, transformed));
    }
    this.applyTransforms(transformed);
    return { document, warnings };
  }

  /**
   * Entries are collected while walking the tree, so an inner group is recorded
   * before the group that contains it. SVG nests transforms: the innermost one
   * applies to the raw coordinates first, each outer one afterwards.
   */
  private applyTransforms(
    entries: { shape: Shape; dx: number; dy: number; scale: number }[],
  ): void {
    for (const entry of entries) {
      if (entry.scale !== 1) {
        entry.shape.scale(entry.scale);
      }
      if (entry.dx !== 0 || entry.dy !== 0) {
        entry.shape.move(entry.dx, entry.dy);
      }
    }
  }

  private toShape(
    node: XmlNode,
    document: SvgDocument,
    warnings: string[],
    transformed: { shape: Shape; dx: number; dy: number; scale: number }[],
  ): ReturnType<ShapeFactory["fromTag"]> {
    let id = node.attrs.id;
    if (!id) {
      id = document.ids.assignMissingId(node.tag);
      warnings.push(`warning: assigned id ${id} to unnamed <${node.tag}>`);
    }
    const shape = this.factory.fromTag(node.tag, id, node.attrs, node.text);
    if (node.attrs.stroke && shape.tagName !== "line") {
      try {
        shape.setAttribute("stroke", node.attrs.stroke);
      } catch {
        /* not applicable */
      }
    }
    if (node.attrs["stroke-width"]) {
      try {
        shape.setAttribute("stroke-width", node.attrs["stroke-width"]);
      } catch {
        /* not applicable */
      }
    }
    if (shape instanceof Group) {
      for (const child of node.children) {
        shape.addChild(this.toShape(child, document, warnings, transformed));
      }
      const transform = parseTransform(node.attrs.transform);
      if (transform.dx !== 0 || transform.dy !== 0 || transform.scale !== 1) {
        transformed.push({ shape, ...transform });
      }
      const unsupported = findUnsupportedTransforms(node.attrs.transform);
      for (const name of unsupported) {
        warnings.push(`warning: unsupported transform ignored on <${node.tag}>: ${name}`);
      }
    }
    return shape;
  }

  private parseRoot(xml: string): XmlNode {
    const stripped = xml
      .replace(/<\?xml[\s\S]*?\?>/, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<!DOCTYPE[\s\S]*?>/i, "")
      .trim();
    const { nodes } = this.parseNodes(stripped, 0);
    const svg = nodes.find((node) => node.tag === "svg");
    if (!svg) {
      throw new EditorError("cannot read file: missing <svg>");
    }
    return svg;
  }

  private parseNodes(s: string, start: number): { nodes: XmlNode[]; next: number } {
    const nodes: XmlNode[] = [];
    let i = start;
    while (i < s.length) {
      const next = s.indexOf("<", i);
      if (next < 0) {
        return { nodes, next: s.length };
      }
      i = next;
      if (s.startsWith("</", i)) {
        return { nodes, next: i };
      }
      const tagMatch = /^<([a-zA-Z][\w:-]*)/.exec(s.slice(i));
      if (!tagMatch) {
        i += 1;
        continue;
      }
      const tag = tagMatch[1]!;
      const afterName = i + 1 + tag.length;
      const endStart = s.indexOf(">", afterName);
      if (endStart < 0) {
        throw new EditorError("cannot read file: malformed svg");
      }
      const attrChunk = s.slice(afterName, endStart).trim();
      const selfClosing = attrChunk.endsWith("/") || s[endStart - 1] === "/";
      const attrs = this.parseAttrs(selfClosing ? attrChunk.replace(/\/$/, "") : attrChunk);
      i = endStart + 1;
      if (selfClosing) {
        nodes.push({ tag, attrs, children: [], text: "" });
        continue;
      }
      const close = `</${tag}>`;
      if (tag === "text") {
        const closeAt = s.indexOf(close, i);
        if (closeAt < 0) {
          throw new EditorError("cannot read file: malformed svg");
        }
        nodes.push({ tag, attrs, children: [], text: this.unescape(s.slice(i, closeAt)) });
        i = closeAt + close.length;
        continue;
      }
      const inner = this.parseNodes(s, i);
      if (!s.startsWith(close, inner.next)) {
        throw new EditorError("cannot read file: malformed svg");
      }
      nodes.push({ tag, attrs, children: inner.nodes, text: "" });
      i = inner.next + close.length;
    }
    return { nodes, next: i };
  }

  private parseAttrs(chunk: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const re = /([^\s=]+)="([^"]*)"/g;
    let match: RegExpExecArray | null = re.exec(chunk);
    while (match) {
      attrs[match[1]!] = this.unescape(match[2]!);
      match = re.exec(chunk);
    }
    return attrs;
  }

  private unescape(value: string): string {
    return value
      .replaceAll("&quot;", '"')
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&amp;", "&");
  }
}
