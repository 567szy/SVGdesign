import { EditorError } from "../core/EditorError.js";
import type { Editor } from "../core/Editor.js";
import type { SvgReader } from "../io/SvgReader.js";
import type { SvgWriter } from "../io/SvgWriter.js";
import { ShapeFactory } from "../shapes/ShapeFactory.js";
import { AddToCommand } from "./AddToCommand.js";
import { CanvasCommand } from "./CanvasCommand.js";
import type { Command } from "./Command.js";
import type { CommandInvoker } from "./CommandInvoker.js";
import { CreateCommand } from "./CreateCommand.js";
import { DeleteCommand } from "./DeleteCommand.js";
import { GroupCommand } from "./GroupCommand.js";
import { HelpCommand } from "./HelpCommand.js";
import { InitCommand } from "./InitCommand.js";
import { MoveCommand } from "./MoveCommand.js";
import { ReadCommand } from "./ReadCommand.js";
import { RedoCommand } from "./RedoCommand.js";
import { SaveCommand } from "./SaveCommand.js";
import { ScaleCommand } from "./ScaleCommand.js";
import { SetCommand } from "./SetCommand.js";
import { ShowCommand } from "./ShowCommand.js";
import { TreeCommand } from "./TreeCommand.js";
import { UndoCommand } from "./UndoCommand.js";
import { UngroupCommand } from "./UngroupCommand.js";
import { ZOrderCommand } from "./ZOrderCommand.js";

export class CommandFactory {
  constructor(
    private readonly editor: Editor,
    private readonly invoker: CommandInvoker,
    private readonly shapes: ShapeFactory,
    private readonly reader: SvgReader,
    private readonly writer: SvgWriter,
  ) {}

  create(tokens: string[]): Command {
    const [name, ...args] = tokens;
    if (!name) {
      throw new EditorError("empty command");
    }
    switch (name) {
      case "init":
        return new InitCommand(this.editor, this.num(args[0], 800), this.num(args[1], 600));
      case "read":
        return new ReadCommand(this.editor, this.reader, this.need(args[0], "read <file.svg>"));
      case "save":
        return new SaveCommand(this.editor, this.writer, args[0]);
      case "canvas":
        return new CanvasCommand(
          this.editor,
          args[0] !== undefined ? this.num(args[0]) : undefined,
          args[1] !== undefined ? this.num(args[1]) : undefined,
        );
      case "create": {
        const type = this.need(args[0], "create <type> <id> …");
        const id = this.need(args[1], "create <type> <id> …");
        const { rest, containerId } = this.splitIn(args.slice(2));
        return new CreateCommand(this.editor, this.shapes, type, id, rest, containerId);
      }
      case "delete":
        return new DeleteCommand(this.editor, this.need(args[0], "delete <id>"));
      case "move":
        return new MoveCommand(
          this.editor,
          this.need(args[0], "move <id> <dx> <dy>"),
          this.num(args[1]),
          this.num(args[2]),
        );
      case "scale":
        return new ScaleCommand(this.editor, this.need(args[0], "scale <id> <factor>"), this.num(args[1]));
      case "set":
        return new SetCommand(
          this.editor,
          this.need(args[0], "set <id> <attr> <value>"),
          this.need(args[1], "set <id> <attr> <value>"),
          this.need(args[2], "set <id> <attr> <value>"),
        );
      case "group":
        return new GroupCommand(
          this.editor,
          this.need(args[0], "group <newGid> <id1> <id2>…"),
          args.slice(1),
        );
      case "ungroup":
        return new UngroupCommand(this.editor, this.need(args[0], "ungroup <gid>"));
      case "addto":
        return new AddToCommand(
          this.editor,
          this.need(args[0], "addto <gid> <id>"),
          this.need(args[1], "addto <gid> <id>"),
        );
      case "front":
        return new ZOrderCommand(this.editor, this.need(args[0], "front <id>"), true);
      case "back":
        return new ZOrderCommand(this.editor, this.need(args[0], "back <id>"), false);
      case "tree":
        return new TreeCommand(this.editor, args[0]);
      case "show":
        return new ShowCommand(this.editor, this.need(args[0], "show <id>"));
      case "help":
        return new HelpCommand();
      case "undo":
        return new UndoCommand(this.invoker);
      case "redo":
        return new RedoCommand(this.invoker);
      default:
        throw new EditorError(`unknown command: ${name}`);
    }
  }

  private splitIn(args: string[]): { rest: string[]; containerId?: string } {
    if (args.length >= 2 && args[args.length - 2] === "in") {
      return { rest: args.slice(0, -2), containerId: args[args.length - 1] };
    }
    return { rest: args };
  }

  private need(value: string | undefined, usage: string): string {
    if (!value) {
      throw new EditorError(`usage: ${usage}`);
    }
    return value;
  }

  private num(value: string | undefined, fallback?: number): number {
    if (value === undefined) {
      if (fallback !== undefined) {
        return fallback;
      }
      throw new EditorError("expected a number");
    }
    const n = Number(value);
    if (Number.isNaN(n)) {
      throw new EditorError("expected a number");
    }
    return n;
  }
}
