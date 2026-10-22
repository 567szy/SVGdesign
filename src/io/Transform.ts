import type { Shape } from "../core/Shape.js";

export interface ParsedTransform {
  dx: number;
  dy: number;
  scale: number;
}

const TRANSLATE_PATTERN = /translate\(\s*([-\d.]+)(?:[\s,]+([-\d.]+))?\s*\)/g;
const SCALE_PATTERN = /scale\(\s*([-\d.]+)(?:[\s,]+([-\d.]+))?\s*\)/g;
const UNSUPPORTED_PATTERN = /(rotate|matrix|skew[XY]?)\s*\(/g;

/**
 * The object model has no transform attribute: groups apply move/scale to their
 * descendants directly. To stay lossless on read, the subset of SVG transforms
 * this editor can express is flattened onto the geometry instead.
 */
export function parseTransform(value: string | undefined): ParsedTransform {
  const parsed: ParsedTransform = { dx: 0, dy: 0, scale: 1 };
  if (!value) {
    return parsed;
  }
  for (const match of value.matchAll(TRANSLATE_PATTERN)) {
    parsed.dx += Number(match[1]);
    parsed.dy += match[2] === undefined ? 0 : Number(match[2]);
  }
  for (const match of value.matchAll(SCALE_PATTERN)) {
    parsed.scale *= Number(match[1]);
  }
  return parsed;
}

export function findUnsupportedTransforms(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  const names = new Set<string>();
  for (const match of value.matchAll(UNSUPPORTED_PATTERN)) {
    names.add(match[1]!);
  }
  return [...names];
}
