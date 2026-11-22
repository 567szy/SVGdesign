import { EditorError } from "../core/EditorError.js";
import type { Command, CommandRegistration } from "./Command.js";

export class CommandFactory {
  constructor(private readonly commands: ReadonlyMap<string, CommandRegistration>) {}

  create([name, ...args]: string[]): Command {
    if (!name) throw new EditorError("empty command");
    const registration = this.commands.get(name);
    if (!registration) throw new EditorError(`unknown command: ${name}`);
    const command = registration.create(args);
    if (command.name !== name) throw new EditorError(`command name mismatch: ${name}`);
    return command;
  }
}
