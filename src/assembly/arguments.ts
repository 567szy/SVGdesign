import { EditorError } from "../core/EditorError.js";

export function parseArguments(args: string[]): { config?: string; files: string[] } {
  const files: string[] = [];
  let config: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--config") {
      const path = args[++index];
      if (config !== undefined || !path || path.startsWith("--")) {
        throw new EditorError("usage: --config <file.json>");
      }
      config = path;
    } else {
      files.push(arg);
    }
  }
  return { config, files };
}
