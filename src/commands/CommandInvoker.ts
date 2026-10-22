import { EditorError } from "../core/EditorError.js";
import type { Editor } from "../core/Editor.js";
import type { Command } from "./Command.js";

export class CommandInvoker {
  private readonly undoStack: Command[] = [];
  private readonly redoStack: Command[] = [];

  constructor(private readonly editor: Editor) {}

  run(command: Command): string {
    const output = command.execute();
    if (command.kind === "query") {
      return output;
    }
    if (command.kind === "io") {
      this.editor.markIo();
      return output;
    }
    this.editor.markEdit();
    this.undoStack.push(command);
    this.redoStack.length = 0;
    return output;
  }

  undo(): string {
    this.editor.assertUndoAllowed();
    const command = this.undoStack.pop();
    if (!command) {
      throw new EditorError("nothing to undo");
    }
    const output = command.undo();
    this.redoStack.push(command);
    return output;
  }

  redo(): string {
    this.editor.assertUndoAllowed();
    const command = this.redoStack.pop();
    if (!command) {
      throw new EditorError("nothing to redo");
    }
    const output = command.execute();
    this.undoStack.push(command);
    return output;
  }
}
