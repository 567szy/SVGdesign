import { EditorError } from "./EditorError.js";
import { SvgDocument } from "./SvgDocument.js";

export class Editor {
  private document: SvgDocument | null = null;
  private ioLocked = false;

  getDocument(): SvgDocument | null {
    return this.document;
  }

  requireDocument(): SvgDocument {
    if (!this.document) {
      throw new EditorError("no document. use 'init' or 'read' first");
    }
    return this.document;
  }

  replaceDocument(document: SvgDocument): void {
    this.document = document;
    this.ioLocked = true;
  }

  markIo(): void {
    this.ioLocked = true;
  }

  markEdit(): void {
    this.ioLocked = false;
  }

  assertUndoAllowed(): void {
    if (this.ioLocked) {
      throw new EditorError("undo not allowed after io command");
    }
  }
}
