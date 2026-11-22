import * as readline from "node:readline";
import type { CommandFactory } from "../commands/CommandFactory.js";
import type { CommandInvoker } from "../commands/CommandInvoker.js";
import { EditorError } from "../core/EditorError.js";
import { LineParser } from "./LineParser.js";

export class Repl {
  private readonly parser = new LineParser();

  constructor(
    private readonly factory: CommandFactory,
    private readonly invoker: CommandInvoker,
  ) {}

  start(): void {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "svg> ",
    });
    console.log("svg-editor 0.1 — type 'help' for commands");
    rl.prompt();
    rl.on("line", (line) => {
      const trimmed = line.trim();
      if (trimmed === "exit" || trimmed === "quit") {
        rl.close();
        return;
      }
      const output = this.evalLine(line);
      if (output) {
        console.log(output);
      }
      rl.prompt();
    });
  }

  evalLine(line: string): string | undefined {
    try {
      const tokens = this.parser.parse(line);
      if (!tokens) {
        return undefined;
      }
      const command = this.factory.create(tokens);
      return this.invoker.run(command);
    } catch (error) {
      if (error instanceof EditorError) {
        return error.message;
      }
      return `error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}
