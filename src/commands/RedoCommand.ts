import type { CommandInvoker } from "./CommandInvoker.js";
import type { Command } from "./Command.js";

export class RedoCommand implements Command {
  readonly name = "redo";
  readonly kind = "query" as const;

  constructor(private readonly invoker: CommandInvoker) {}

  execute(): string {
    return this.invoker.redo();
  }

  undo(): string {
    return "";
  }
}
