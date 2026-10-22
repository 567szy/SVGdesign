import * as readline from "node:readline";
import { CommandFactory } from "../commands/CommandFactory.js";
import { CommandInvoker } from "../commands/CommandInvoker.js";
import { Editor } from "../core/Editor.js";
import { EditorError } from "../core/EditorError.js";
import { SvgReader } from "../io/SvgReader.js";
import { SvgWriter } from "../io/SvgWriter.js";
import { ShapeFactory } from "../shapes/ShapeFactory.js";
import { LineParser } from "./LineParser.js";

export class Repl {
  private readonly editor = new Editor();
  private readonly invoker = new CommandInvoker(this.editor);
  private readonly parser = new LineParser();
  private readonly factory: CommandFactory;

  constructor() {
    const shapes = new ShapeFactory();
    this.factory = new CommandFactory(
      this.editor,
      this.invoker,
      shapes,
      new SvgReader(shapes),
      new SvgWriter(),
    );
  }

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
