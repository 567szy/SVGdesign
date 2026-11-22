import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../", import.meta.url));
const tsx = createRequire(import.meta.url).resolve("tsx/cli");
const scratch = mkdtempSync(join(tmpdir(), "svg-regression-"));
const baseline = join(scratch, "final");
const current = join(scratch, "current");
const sessions = [
  ["fixtures/session1.txt", "demo.svg"],
  ["fixtures/flowchart.txt", "flowchart.svg"],
  ["doc/transcript/cli-1.txt", "baseline.svg"],
];

function replay(entry, cwd, input, args = []) {
  return execFileSync(process.execPath, [tsx, entry, ...args], { cwd, input });
}

try {
  mkdirSync(baseline);
  mkdirSync(current);
  const archive = execFileSync("git", ["archive", "final", "src", "fixtures", "package.json"], { cwd: repo });
  execFileSync("tar", ["-xf", "-"], { cwd: baseline, input: archive });
  cpSync(join(baseline, "fixtures"), join(current, "fixtures"), { recursive: true });
  const oldEntry = join(baseline, "src", "runTranscript.ts");
  const newEntry = join(repo, "src", "runTranscript.ts");
  const config = ["--config", join(repo, "plugins.config.json")];
  for (const [transcript, svg] of sessions) {
    const source = transcript.startsWith("fixtures/") ? baseline : repo;
    const input = readFileSync(join(source, transcript));
    const expected = replay(oldEntry, baseline, input);
    const expectedSvg = readFileSync(join(baseline, svg));
    for (const args of [[], config]) {
      const actual = replay(newEntry, current, input, args);
      assert.deepEqual(actual, expected, `Transcript differs for ${transcript} (${args.length ? "config" : "code"})`);
      assert.deepEqual(readFileSync(join(current, svg)), expectedSvg, `SVG differs for ${transcript}`);
    }
    console.log(`Matched final in both modes: ${transcript} and ${svg}`);
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
