import { readFileSync } from "node:fs";
import { Repl } from "./cli/Repl.js";

const file = process.argv[2];
const repl = new Repl();
const source = file ? readFileSync(file, "utf8") : readFileSync(0, "utf8");
for (const line of source.split(/\r?\n/)) {
  const output = repl.evalLine(line);
  if (line.trim() && !line.trim().startsWith("#")) {
    console.log(`svg> ${line}`);
  } else if (line.trim().startsWith("#")) {
    console.log(line);
  }
  if (output) {
    console.log(output);
  }
}
