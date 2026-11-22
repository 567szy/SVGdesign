import { readdirSync } from "node:fs";

export interface DirectoryEntry {
  readonly name: string;
  readonly directory: boolean;
}

export interface DirectoryAccess {
  currentDirectory(): string;
  readDirectory(path: string): readonly DirectoryEntry[];
}

export class NodeDirectoryAccess implements DirectoryAccess {
  currentDirectory(): string {
    return process.cwd();
  }

  readDirectory(path: string): DirectoryEntry[] {
    return readdirSync(path, { withFileTypes: true }).map((entry) => ({
      name: entry.name,
      directory: entry.isDirectory(),
    }));
  }
}
