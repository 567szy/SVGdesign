import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { NodeDirectoryAccess } from "../plugins/dir/DirectoryAccess.js";
import { DirCommand } from "../plugins/dir/index.js";
import { StatsCommand } from "../plugins/stats/index.js";
import { createApp } from "../src/assembly/createApp.js";
import { CommandInvoker } from "../src/commands/CommandInvoker.js";
import { MoveCommand } from "../src/commands/MoveCommand.js";
import { Editor } from "../src/core/Editor.js";
import { Group } from "../src/core/Group.js";
import { SvgDocument } from "../src/core/SvgDocument.js";
import { Circle } from "../src/shapes/Circle.js";
import { Rect } from "../src/shapes/Rect.js";
import { Text } from "../src/shapes/Text.js";

test("stats counts leaves in depth-first first-seen order", () => {
  const document = new SvgDocument(100, 100);
  const stats = new StatsCommand(() => document);
  assert.throws(() => new StatsCommand(() => null).execute(), /no document/);
  assert.equal(stats.execute(), "(total 0, containers 0)");
  const outer = new Group("outer");
  const inner = new Group("inner");
  outer.addChild(new Text("text", 0, 0, "label"));
  outer.addChild(inner);
  inner.addChild(new Rect("nested", 0, 0, 1, 1));
  inner.addChild(new Circle("circle", 0, 0, 1));
  document.add(outer);
  document.add(new Rect("root", 0, 0, 1, 1));
  assert.equal(stats.execute(), "text: 1  rect: 2  circle: 1  (total 4, containers 2)");
});

test("dir alone sorts test-double entries, includes hidden names, and handles empty and failed reads", () => {
  const items = [
    { name: "z.txt", directory: false },
    { name: "a.txt", directory: false },
    { name: "z", directory: true },
    { name: ".", directory: true },
    { name: "..", directory: true },
    { name: ".config", directory: true },
    { name: ".env", directory: false },
  ];
  const expected = "[DIR]  .config\n[DIR]  z\n[FILE]  .env\n[FILE]  a.txt\n[FILE]  z.txt";
  const run = (entries: typeof items) => new DirCommand({
    currentDirectory: () => "/work",
    readDirectory: (path) => {
      assert.equal(path, "/work");
      return entries;
    },
  }).execute();
  assert.equal(run(items), expected);
  assert.equal(run([...items].reverse()), expected);
  assert.equal(run([]), "(empty directory)");
  assert.throws(() => new DirCommand({
    currentDirectory: () => "/work",
    readDirectory: () => { throw new Error("permission denied"); },
  }).execute(), { message: "error: cannot read directory: /work" });
});

test("successful and failing dir queries preserve the document and undo/redo", () => {
  const editor = new Editor();
  const document = new SvgDocument(100, 100);
  document.add(new Circle("c", 2, 3, 4));
  editor.replaceDocument(document);
  const invoker = new CommandInvoker(editor);
  const before = document.toSvg();
  const move = () => new MoveCommand(editor, "c", 20, 30);
  invoker.run(move());
  const after = document.toSvg();
  invoker.undo();
  const good = new DirCommand({ currentDirectory: () => "/work", readDirectory: () => [] });
  const bad = new DirCommand({ currentDirectory: () => "/work", readDirectory: () => { throw new Error(); } });
  assert.equal(invoker.run(good), "(empty directory)");
  assert.throws(() => invoker.run(bad), /cannot read directory/);
  assert.equal(editor.getDocument(), document);
  assert.equal(document.toSvg(), before);
  invoker.redo();
  assert.equal(document.toSvg(), after);
  invoker.undo();
  assert.equal(document.toSvg(), before);
});

test("plugins are independently enabled and listed by help", async (t) => {
  const scratch = mkdtempSync(join(tmpdir(), "svg-command-config-"));
  t.after(() => rmSync(scratch, { recursive: true, force: true }));
  for (const enabled of ["stats", "dir"]) {
    const config = join(scratch, "plugins.json");
    writeFileSync(config, JSON.stringify({ plugins: ["stats", "dir"].map((name) => ({
      module: fileURLToPath(new URL(`../plugins/${name}/`, import.meta.url)),
      enabled: name === enabled,
    })) }));
    const errors: string[] = [];
    const app = await createApp(config, (message) => errors.push(message));
    const disabled = enabled === "dir" ? "stats" : "dir";
    assert.deepEqual(errors, []);
    const help = app.evalLine("help")?.split("\n");
    assert.ok(help?.includes(enabled));
    assert.ok(!help?.includes(disabled));
    assert.equal(app.evalLine(disabled), `error: unknown command: ${disabled}`);
  }
});

test("real adapter and both startup paths give identical results in a fixed working directory", (t) => {
  const scratch = mkdtempSync(join(tmpdir(), "svg-command-replay-"));
  t.after(() => rmSync(scratch, { recursive: true, force: true }));
  const work = join(scratch, "work");
  mkdirSync(join(work, "nested", "hidden-subdir"), { recursive: true });
  writeFileSync(join(work, "nested", "input.svg"), '<svg><circle id="c" r="4"/></svg>');
  writeFileSync(join(work, ".env"), "");
  writeFileSync(join(work, "regular"), "");
  const expected = "[DIR]  nested\n[FILE]  .env\n[FILE]  regular";
  assert.deepEqual(new NodeDirectoryAccess().readDirectory(work).map((entry) => entry.name).sort(),
    [".env", "nested", "regular"]);

  const repo = new URL("../", import.meta.url);
  const entry = fileURLToPath(new URL("src/runTranscript.ts", repo));
  const config = fileURLToPath(new URL("plugins.config.json", repo));
  const tsx = createRequire(import.meta.url).resolve("tsx/cli");
  const session = readFileSync(new URL("doc/transcript/cli-commands.txt", repo), "utf8");
  const expectedSession = readFileSync(new URL("doc/transcript/cli-commands.expected.txt", repo), "utf8")
    .replaceAll("\r\n", "\n");
  const run = (args: string[], input: string) => execFileSync(process.execPath, [tsx, entry, ...args], {
    cwd: work, input, env: { ...process.env, SVG_EDITOR_BUILTINS_ONLY: "0" },
  });
  const code = run([], session);
  const configured = run(["--config", config], session);
  assert.deepEqual(configured, code);
  assert.equal(code.toString(), expectedSession);
  const output = run([], "dir\nread nested/input.svg\ndir\nsave nested/out.svg\ndir\n").toString();
  assert.equal(output.split(expected).length - 1, 3);
});
