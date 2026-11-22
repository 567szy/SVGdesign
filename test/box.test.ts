import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import box, { BoxProvider } from "../plugins/box/index.js";
import { createApp } from "../src/assembly/createApp.js";
import { Extensions } from "../src/core/Extensions.js";

const repo = new URL("../", import.meta.url);

function temporaryDirectory(t: { after(fn: () => void): void }): string {
  const directory = mkdtempSync(join(tmpdir(), "svg-box-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test("box activates with an isolated context and creates and clones its own parts", () => {
  const extensions = new Extensions();
  box.activate({ getDocument: () => null, register: extensions.register.bind(extensions) });
  assert.deepEqual([...extensions.shapes.keys()], ["box"]);
  assert.deepEqual([...extensions.attributes.keys()], ["box-attributes"]);
  assert.deepEqual([...extensions.decorators.keys()], ["box-type-label"]);
  const provider = new BoxProvider();
  assert.throws(() => provider.create("x", ["NaN", "100", "160", "60", "Start"]), /usage: create box/);
  const shape = provider.create("x", ["120", "100", "160", "60", "Start"]);
  provider.finishRead(shape);
  assert.deepEqual(shape.children().map(({ id, tagName }) => [id, tagName]), [["x-rect", "rect"], ["x-label", "text"]]);
  assert.equal(shape.children()[1].treeGeometry(), '(140,135) "Start"');
  assert.notEqual(shape.cloneDeep().children()[0], shape.children()[0]);
  assert.equal(shape.cloneDeep().toSvg(0), shape.toSvg(0));
});

test("box attributes undo and redo independently and survive recreation", async () => {
  const app = await createApp();
  const run = (line: string) => app.evalLine(line);
  run("init");
  run('create box n1 120 100 160 60 "开始"');
  assert.equal(run("set n1 fill #f5a623"), "box#n1 fill propagated to n1-rect");
  assert.match(run("show n1-rect")!, /fill=#f5a623/);
  run("undo");
  assert.match(run("show n1-rect")!, /fill=#4a90d9/);
  run("redo");
  assert.match(run("show n1-rect")!, /fill=#f5a623/);
  assert.equal(run('set n1 label "处理数据 v2"'), 'box#n1 label updated: "处理数据 v2"');
  assert.equal(run("undo"), 'box#n1 label restored: "开始"');
  assert.match(run("show n1-label")!, /"开始"/);
  run("redo");
  assert.match(run("show n1-label")!, /"处理数据 v2"/);
  run("undo");
  run("undo");
  run("undo");
  assert.equal(run("show n1"), "error: no such shape: n1");
  run("redo");
  run("redo");
  run("redo");
  assert.match(run("show n1-rect")!, /fill=#f5a623/);
  assert.match(run("show n1-label")!, /"处理数据 v2"/);
  assert.equal(run("set n1-rect label red"), "error: unknown attribute: label");
});

test("box nesting, protected parts, and subtree collisions leave the document consistent", async () => {
  const app = await createApp();
  const run = (line: string) => app.evalLine(line);
  run("init");
  run("create g outer");
  run("create rect blocked-label 0 0 1 1");
  assert.equal(run('create box blocked 0 0 100 60 "Blocked"'), "error: id already exists: blocked-label");
  assert.equal(run("show blocked"), "error: no such shape: blocked");
  assert.equal(run("show blocked-rect"), "error: no such shape: blocked-rect");
  run('create box inner 10 20 160 60 "Inner" in outer');
  run('create box nested 30 40 80 20 "Nested" in inner');
  const before = run("tree");
  assert.equal(run("ungroup inner"), "error: cannot ungroup composite shape: inner");
  assert.equal(run("delete inner-rect"), "error: cannot remove required box part: inner-rect");
  assert.equal(run("addto outer inner-label"), "error: cannot remove required box part: inner-label");
  assert.equal(run("group failed blocked-label inner-label"), "error: cannot remove required box part: inner-label");
  assert.equal(run("tree"), before);
  run("move inner 0 100");
  assert.match(run("show nested-rect")!, /x=30 y=140/);
  run("undo");
  run("delete inner");
  assert.equal(run("show nested-rect"), "error: no such shape: nested-rect");
  run("undo");
  assert.equal(run("tree"), before);
  assert.match(run("stats")!, /\(total 5, containers 3\)/);
});

test("marked SVG round-trips, degrades without box, and rejects malformed boxes or duplicate ids", async (t) => {
  const directory = temporaryDirectory(t);
  const file = join(directory, "box.svg");
  const boxConfig = join(directory, "box-only.json");
  writeFileSync(boxConfig, JSON.stringify({ plugins: [{ module: fileURLToPath(new URL("plugins/box/", repo)) }] }));
  const app = await createApp(boxConfig);
  const run = (line: string) => app.evalLine(line);
  run("init");
  run('create box x 0 0 100 60 "Label"');
  const tree = run("tree");
  assert.match(run(`save "${file}"`)!, /^saved to /);
  assert.match(readFileSync(file, "utf8"), /<g id="x" data-kind="box">/);
  assert.match(run(`read "${file}"`)!, /^read /);
  assert.equal(run("tree"), tree);
  const config = join(directory, "empty.json");
  writeFileSync(config, '{"plugins":[]}');
  const plain = await createApp(config);
  assert.match(plain.evalLine(`read "${file}"`)!, /^read /);
  assert.equal(plain.evalLine("tree"), tree?.replace(" (box)", ""));
  assert.equal(plain.evalLine("set x label Plain"), "error: unknown attribute: label");
  assert.match(run('set x label "Still here"')!, /^box#x label updated/);
  for (const [markup, error] of [
    ['<g id="bad" data-kind="box"><rect id="bad-rect"/></g>', "error: invalid box: bad"],
    ['<g id="bad" data-kind="box"><rect id="bad-rect"/><rect id="bad-label"/></g>', "error: invalid box: bad"],
    ['<g id="bad" data-kind="box"><rect id="bad-rect"/><text id="bad-label"/><text id="bad-label"/></g>',
      "error: id already exists: bad-label"],
  ]) {
    writeFileSync(file, `<svg>${markup}</svg>`);
    assert.ok(run(`read "${file}"`)?.startsWith(error));
    assert.match(run("show x-label")!, /"Still here"/);
  }
  run("undo");
  assert.equal(run("tree"), tree);
});

test("Phase 1 version B session produces identical output and SVG with either assembly", (t) => {
  const directory = temporaryDirectory(t);
  const config = fileURLToPath(new URL("plugins.config.json", repo));
  const entry = fileURLToPath(new URL("src/runTranscript.ts", repo));
  const tsx = createRequire(import.meta.url).resolve("tsx/cli");
  const input = readFileSync(new URL("doc/transcript/cli-box.txt", repo));
  const expected = readFileSync(new URL("doc/transcript/cli-box.expected.txt", repo), "utf8").replaceAll("\r\n", "\n");
  const expectedSvg = readFileSync(new URL("fixtures/flowchart-box.expected.svg", repo), "utf8").replaceAll("\r\n", "\n");
  const run = (args: string[]) => {
    const output = execFileSync(process.execPath, [tsx, entry, ...args], {
      cwd: directory, input, env: { ...process.env, SVG_EDITOR_BUILTINS_ONLY: "0" },
    });
    return [output, readFileSync(join(directory, "flowchart-box.svg"))];
  };
  const code = run([]);
  assert.deepEqual(run(["--config", config]), code);
  assert.equal(code[0].toString().replace(/ \*$/gm, ""), expected);
  assert.equal(code[1].toString(), expectedSvg);
});
