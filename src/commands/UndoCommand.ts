import type { CommandInvoker } from "./CommandInvoker.js";
import type { Command } from "./Command.js";

export class UndoCommand implements Command {
  readonly name = "undo";
  readonly kind = "query" as const;

  constructor(private readonly invoker: CommandInvoker) {}

  execute(): string {
    return this.invoker.undo();
  }

  undo(): string {
    return "";
  }
}
