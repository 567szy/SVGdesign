import type { Command, CommandRegistration } from "./Command.js";

export class HelpCommand implements Command {
  readonly name = "help";
  readonly kind = "query" as const;

  constructor(private readonly commands: ReadonlyMap<string, CommandRegistration>) {}

  execute(): string {
    return Array.from(this.commands.values(), (command) => command.help).join("\n");
  }

  undo(): string {
    return "";
  }
}
