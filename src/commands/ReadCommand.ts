import { readFileSync } from "node:fs";
import { EditorError } from "../core/EditorError.js";
import type { Editor } from "../core/Editor.js";
import type { SvgDocument } from "../core/SvgDocument.js";
import type { SvgReader } from "../io/SvgReader.js";
import type { Command } from "./Command.js";

export class ReadCommand implements Command {
  readonly name = "read";
  readonly kind = "io" as const;

  constructor(
    private readonly editor: Editor,
    private readonly reader: SvgReader,
    private readonly file: string,
    private readonly onSaved: (document: SvgDocument) => string[],
  ) {}

  execute(): string {
    let xml: string;
    try {
      xml = readFileSync(this.file, "utf8");
    } catch {
      throw new EditorError(`cannot read file: ${this.file}`);
    }
    const { document, warnings } = this.reader.parse(xml);
    document.sourcePath = this.file;
    this.editor.replaceDocument(document);
    const summary = `read ${this.file} (${document.elementCount} elements)`;
    return [...warnings, summary, ...this.onSaved(document)].join("\n");
  }

  undo(): string {
    return "";
  }
}
