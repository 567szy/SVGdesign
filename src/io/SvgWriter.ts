import type { SvgDocument } from "../core/SvgDocument.js";

export class SvgWriter {
  write(document: SvgDocument): string {
    return document.toSvg();
  }
}
