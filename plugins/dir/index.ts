import type { Command } from "../../src/commands/Command.js";
import { EditorError } from "../../src/core/EditorError.js";
import type { Plugin, PluginContext } from "../../src/core/Extensions.js";
import { NodeDirectoryAccess, type DirectoryAccess, type DirectoryEntry } from "./DirectoryAccess.js";

export class DirCommand implements Command {
  readonly name = "dir";
  readonly kind = "query";

  constructor(private readonly access: DirectoryAccess) {}

  execute(): string {
    const path = this.access.currentDirectory();
    let entries: DirectoryEntry[];
    try {
      entries = this.access.readDirectory(path).filter(({ name }) => name !== "." && name !== "..");
    } catch {
      throw new EditorError(`cannot read directory: ${path}`);
    }

    entries.sort((left, right) => {
      if (left.directory !== right.directory) return left.directory ? -1 : 1;
      if (left.name === right.name) return 0;
      return left.name < right.name ? -1 : 1;
    });
    if (!entries.length) return "(empty directory)";
    return entries.map(({ directory, name }) => `${directory ? "[DIR]" : "[FILE]"}  ${name}`).join("\n");
  }

  undo(): string {
    return "";
  }
}

class DirPlugin implements Plugin {
  constructor(private readonly access: DirectoryAccess = new NodeDirectoryAccess()) {}

  activate(context: PluginContext): void {
    context.register("commands", "dir", {
      help: "dir",
      create: (args) => {
        if (args.length) throw new EditorError("usage: dir");
        return new DirCommand(this.access);
      },
    });
  }
}

export default new DirPlugin();
