import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { PluginLoader } from "../src/assembly/PluginLoader.js";
import { registerBuiltinCommands } from "../src/builtins/commands.js";
import { registerBuiltinShapes } from "../src/builtins/shapes.js";
import { Repl } from "../src/cli/Repl.js";
import { CommandFactory } from "../src/commands/CommandFactory.js";
import { CommandInvoker } from "../src/commands/CommandInvoker.js";
import { Editor } from "../src/core/Editor.js";
import { Extensions, type AttributeHandler, type ShapeProvider } from "../src/core/Extensions.js";
import { Group } from "../src/core/Group.js";
import { SvgReader } from "../src/io/SvgReader.js";
import { SvgWriter } from "../src/io/SvgWriter.js";
import { ShapeFactory } from "../src/shapes/ShapeFactory.js";

function setup() {
  const editor = new Editor();
  const extensions = new Extensions();
  const invoker = new CommandInvoker(editor);
  const shapes = new ShapeFactory(extensions.shapes);
  const reader = new SvgReader(shapes);
  const errors: string[] = [];
  registerBuiltinShapes(extensions);
  registerBuiltinCommands(extensions, editor, invoker, shapes, reader, new SvgWriter());
  return {
    extensions,
    editor,
    reader,
    loader: new PluginLoader(extensions, editor, (message) => errors.push(message)),
    errors,
    repl: new Repl(new CommandFactory(extensions.commands), invoker),
  };
}

test("a shape provider creates and reads a marked SVG element; missing provider falls back", async () => {
  class CustomGroup extends Group {
    override get type() { return "custom"; }
  }
  class Provider implements ShapeProvider {
    readonly name = "custom";
    readonly svgTag = "g";
    create(id: string) { return new CustomGroup(id); }
    read(id: string) { return this.create(id); }
    finishRead(shape: CustomGroup) { assert.equal(shape.children().length, 1); }
  }
  const app = setup();
  await app.loader.load({
    manifest: { name: "custom-package", contributes: { shapes: ["custom"], decorators: ["test"] } },
    plugin: { activate(ctx) {
      ctx.register("shapes", "custom", new Provider());
      ctx.register("decorators", "test", new class {
        label(_document: unknown, shape?: { type: string }) {
          return shape?.type === "custom" ? "(custom)" : undefined;
        }
      }());
    } },
  });
  assert.deepEqual(app.errors, []);
  app.repl.evalLine("init");
  assert.equal(app.repl.evalLine("create custom x"), "custom#x created");
  assert.equal(app.repl.evalLine("move x 2 3"), "custom#x moved by (2,3)");
  assert.equal(app.repl.evalLine("undo"), "custom#x moved back by (-2,-3)");
  assert.equal(app.repl.evalLine("tree x"), "g#x (custom)");
  assert.equal(app.repl.evalLine("tree"), "svg (800x600)\n└── g#x (custom)");
  const xml = '<svg><g id="x" data-kind="custom"><g id="y"/></g></svg>';
  assert.equal(app.reader.parse(xml).document.ids.get("x").type, "custom");
  assert.equal(setup().reader.parse(xml).document.ids.get("x").type, "g");
  assert.throws(() => app.reader.parse('<svg><g id="x"><g id="x"/></g></svg>'), /id already exists: x/);
});

test("set stages writes, preserves history after failures, and undoes the whole change", () => {
  const { repl, editor, extensions } = setup();
  const evalLine = (line: string) => repl.evalLine(line);
  evalLine("init");
  evalLine("create g root");
  evalLine("create g child in root");
  evalLine("create circle circle 0 0 20");
  evalLine("move circle 1 2");
  evalLine("undo");
  const before = editor.requireDocument().toSvg();
  const handler: AttributeHandler = {
    handles: (_shape, attr) => ["paint", "bad-write", "throws"].includes(attr),
    apply: (target, attr, value, set) => {
      set(target, "fill", value);
      if (attr === "throws") throw new Error("handler stopped");
      set(target.children[0], attr === "bad-write" ? "missing" : "fill", value);
    },
  };
  extensions.register("attributes", "paint", handler);
  assert.equal(evalLine("set root throws red"), "error: handler stopped");
  assert.equal(evalLine("set root bad-write red"), "error: unknown attribute: missing");
  assert.equal(editor.requireDocument().toSvg(), before);
  assert.match(evalLine("redo")!, /circle#circle moved/);
  evalLine("undo");
  assert.equal(evalLine("set root paint red"), 'g#root updated: paint="red"');
  assert.equal(editor.requireDocument().ids.get("root").getAttribute("fill"), "red");
  assert.equal(editor.requireDocument().ids.get("child").getAttribute("fill"), "red");
  evalLine("undo");
  assert.equal(editor.requireDocument().toSvg(), before);
  evalLine("redo");
  assert.equal(editor.requireDocument().ids.get("child").getAttribute("fill"), "red");
  extensions.register("attributes", "conflict", handler);
  assert.equal(evalLine("set root paint blue"), "error: conflicting attribute handlers: paint");
  assert.equal(evalLine("set root unknown red"), "error: unknown attribute: unknown");
  assert.equal(evalLine("set root fill blue"), 'g#root updated: fill="blue"');
});

test("config loading continues after each failure and compares declared names atomically", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "svg-plugins-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const createPackage = (path: string, name: string, contributes: object, source: string) => {
    const root = join(dir, path);
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, "package.json"), JSON.stringify({
      name, type: "module", main: "index.js", exports: { import: "./index.js" }, contributes,
    }));
    writeFileSync(join(root, "index.js"), source);
  };
  const command = `class Probe {
    constructor(name, output) { this.name = name; this.output = output; this.kind = "query"; }
    execute() { return this.output; }
    undo() { return ""; }
  }
  function register(ctx, name, output) {
    ctx.register("commands", name, { help: name, create: () => new Probe(name, output) });
  }`;
  createPackage("no-export", "no-export", {}, "export const value = 1;");
  createPackage("mismatch", "mismatch", { commands: ["different"] },
    command + 'export default { activate(ctx) { register(ctx, "probe", "bad"); } };');
  createPackage("throws", "throws", {},
    command + 'export default { activate(ctx) { register(ctx, "probe", "bad"); throw new Error("boom"); } };');
  createPackage("duplicate", "duplicate", {},
    command + 'export default { activate(ctx) { register(ctx, "probe", "bad"); register(ctx, "help", "bad"); } };');
  createPackage("node_modules/broken", "broken", {}, 'import "absent-dependency"; export default {};');
  createPackage("node_modules/probe", "probe", { commands: ["probe"] },
    command + 'export default { activate(ctx, options) { register(ctx, "probe", options.message); } };');
  const config = join(dir, "plugins.json");
  writeFileSync(config, JSON.stringify({ plugins: [
    { module: "missing-package" }, { module: "./no-export" }, { module: "./mismatch" },
    { module: "./throws" }, { module: "./duplicate" }, { module: "broken" },
    { module: "./ignored", enabled: false }, { module: "probe", options: { message: "configured" } },
  ] }));
  const app = setup();
  await app.loader.loadConfig(config);
  assert.equal(app.errors.length, 6);
  assert.equal(app.errors[0], "error: plugin not found: missing-package");
  assert.equal(app.errors[1], "error: plugin has no default export: ./no-export");
  assert.equal(app.errors[2], "error: plugin manifest mismatch: mismatch (declared: commands/different, registered: commands/probe)");
  assert.equal(app.errors[3], "error: plugin failed to activate: throws (boom)");
  assert.equal(app.errors[4], "error: duplicate registration: commands/help");
  assert.match(app.errors[5], /^error: plugin failed to activate: broken .*absent-dependency/);
  assert.equal(app.repl.evalLine("probe"), "configured");
  const help = app.repl.evalLine("help")!;
  assert.match(help, /^init .+\n/);
  assert.ok(help.endsWith("\nprobe"));
  const { default: plugin } = await import(pathToFileURL(join(dir, "node_modules/probe/index.js")).href);
  const code = setup();
  await code.loader.load({
    manifest: { name: "probe", contributes: { commands: ["probe"] } },
    plugin,
    options: { message: "configured" },
  });
  assert.deepEqual(code.errors, []);
  assert.equal(code.repl.evalLine("probe"), app.repl.evalLine("probe"));
  assert.equal(code.repl.evalLine("help"), help);

  writeFileSync(config, '{"plugins":[{"module":"probe"},{"module":8}]}');
  const invalid = setup();
  await invalid.loader.loadConfig(config);
  assert.deepEqual(invalid.errors, ["error: invalid plugin config"]);
  assert.equal(invalid.repl.evalLine("probe"), "error: unknown command: probe");
  assert.match(invalid.repl.evalLine("help")!, /^init /);
});
