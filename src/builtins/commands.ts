import { EditorError } from "../core/EditorError.js";
import type { Editor } from "../core/Editor.js";
import type { SvgReader } from "../io/SvgReader.js";
import type { SvgWriter } from "../io/SvgWriter.js";
import type { ShapeFactory } from "../shapes/ShapeFactory.js";
import { AddToCommand } from "../commands/AddToCommand.js";
import { CanvasCommand } from "../commands/CanvasCommand.js";
import type { Command } from "../commands/Command.js";
import type { CommandInvoker } from "../commands/CommandInvoker.js";
import { CreateCommand } from "../commands/CreateCommand.js";
import { DeleteCommand } from "../commands/DeleteCommand.js";
import { GroupCommand } from "../commands/GroupCommand.js";
import { HelpCommand } from "../commands/HelpCommand.js";
import { InitCommand } from "../commands/InitCommand.js";
import { MoveCommand } from "../commands/MoveCommand.js";
import { ReadCommand } from "../commands/ReadCommand.js";
import { RedoCommand } from "../commands/RedoCommand.js";
import { SaveCommand } from "../commands/SaveCommand.js";
import { ScaleCommand } from "../commands/ScaleCommand.js";
import { SetCommand } from "../commands/SetCommand.js";
import { ShowCommand } from "../commands/ShowCommand.js";
import { TreeCommand } from "../commands/TreeCommand.js";
import { UndoCommand } from "../commands/UndoCommand.js";
import { UngroupCommand } from "../commands/UngroupCommand.js";
import { ZOrderCommand } from "../commands/ZOrderCommand.js";
import type { Extensions } from "../core/Extensions.js";

export function registerBuiltinCommands(
  extensions: Extensions,
  editor: Editor,
  invoker: CommandInvoker,
  shapes: ShapeFactory,
  reader: SvgReader,
  writer: SvgWriter,
): void {
  const register = (name: string, help: string, create: (args: string[]) => Command) => {
    extensions.register("commands", name, { help, create });
  };
  register("init", "init [w] [h]", (args) => new InitCommand(editor, num(args[0], 800), num(args[1], 600)));
  const onSaved = (document: ReturnType<Editor["requireDocument"]>) => {
    const warnings: string[] = [];
    for (const [name, decorator] of extensions.decorators) {
      try {
        decorator.onSaved?.(document);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        warnings.push(`error: tree decorator ${name} failed: ${reason}`);
      }
    }
    return warnings;
  };
  register("read", "read <file.svg>", (args) => new ReadCommand(editor, reader, need(args[0], "read <file.svg>"), onSaved));
  register("save", "save [file.svg]", (args) => new SaveCommand(editor, writer, args[0], onSaved));
  register("canvas", "canvas [w] [h]", (args) => new CanvasCommand(
    editor,
    args[0] !== undefined ? num(args[0]) : undefined,
    args[1] !== undefined ? num(args[1]) : undefined,
  ));
  register("create", "create <type> <id> [params…] [in <containerId>]", (args) => {
    const type = need(args[0], "create <type> <id> …");
    const id = need(args[1], "create <type> <id> …");
    const { rest, containerId } = splitIn(args.slice(2));
    return new CreateCommand(editor, shapes, type, id, rest, containerId);
  });
  register("delete", "delete <id>", (args) => new DeleteCommand(editor, need(args[0], "delete <id>")));
  register("move", "move <id> <dx> <dy>", (args) => new MoveCommand(
    editor,
    need(args[0], "move <id> <dx> <dy>"),
    num(args[1]),
    num(args[2]),
  ));
  register("scale", "scale <id> <factor>", (args) => new ScaleCommand(editor, need(args[0], "scale <id> <factor>"), num(args[1])));
  register("set", "set <id> <attr> <value>", (args) => new SetCommand(
    editor,
    need(args[0], "set <id> <attr> <value>"),
    need(args[1], "set <id> <attr> <value>"),
    need(args[2], "set <id> <attr> <value>"),
    extensions.attributes,
  ));
  register("group", "group <newGid> <id1> <id2>…", (args) => new GroupCommand(
    editor,
    need(args[0], "group <newGid> <id1> <id2>…"),
    args.slice(1),
  ));
  register("ungroup", "ungroup <gid>", (args) => new UngroupCommand(editor, need(args[0], "ungroup <gid>")));
  register("addto", "addto <gid> <id>", (args) => new AddToCommand(
    editor,
    need(args[0], "addto <gid> <id>"),
    need(args[1], "addto <gid> <id>"),
  ));
  register("front", "front <id>", (args) => new ZOrderCommand(editor, need(args[0], "front <id>"), true));
  register("back", "back <id>", (args) => new ZOrderCommand(editor, need(args[0], "back <id>"), false));
  register("tree", "tree [id]", (args) => new TreeCommand(editor, args[0], extensions.decorators));
  register("show", "show <id>", (args) => new ShowCommand(editor, need(args[0], "show <id>")));
  register("undo", "undo", () => new UndoCommand(invoker));
  register("redo", "redo", () => new RedoCommand(invoker));
  register("help", "help", () => new HelpCommand(extensions.commands));
}

function splitIn(args: string[]): { rest: string[]; containerId?: string } {
  if (args.length >= 2 && args[args.length - 2] === "in") {
    return { rest: args.slice(0, -2), containerId: args[args.length - 1] };
  }
  return { rest: args };
}

function need(value: string | undefined, usage: string): string {
  if (!value) {
    throw new EditorError(`usage: ${usage}`);
  }
  return value;
}

function num(value: string | undefined, fallback?: number): number {
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
