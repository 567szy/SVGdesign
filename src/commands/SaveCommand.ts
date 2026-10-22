import { writeFileSync } from "node:fs";
import { EditorError } from "../core/EditorError.js";
import type { Editor } from "../core/Editor.js";
import type { SvgWriter } from "../io/SvgWriter.js";
import type { Command } from "./Command.js";

export class SaveCommand implements Command {
  readonly name = "save";
  readonly kind = "io" as const;

  constructor(
    private readonly editor: Editor,
    private readonly writer: SvgWriter,
    private readonly file?: string,
  ) {}

  execute(): string {
    const doc = this.editor.requireDocument();
    const path = this.file ?? doc.sourcePath;
    if (!path) {
      throw new EditorError("cannot write file: (no path)");
    }
    try {
      writeFileSync(path, this.writer.write(doc), "utf8");
    } catch {
      throw new EditorError(`cannot write file: ${path}`);
    }
    doc.sourcePath = path;
    return `saved to ${path} (${doc.elementCount} elements)`;
  }

  undo(): string {
    return "";
  }
}
