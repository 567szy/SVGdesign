import { parseArguments } from "./assembly/arguments.js";
import { createApp } from "./assembly/createApp.js";

try {
  const { config } = parseArguments(process.argv.slice(2));
  (await createApp(config)).start();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
