import { readFileSync } from "node:fs";
import { parseArguments } from "./assembly/arguments.js";
import { createApp } from "./assembly/createApp.js";

const { config, files: [file] } = parseArguments(process.argv.slice(2));
const repl = await createApp(config);
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
