import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve as resolveModule } from "import-meta-resolve";
import type { Editor } from "../core/Editor.js";
import { EditorError } from "../core/EditorError.js";
import { categories, Extensions, type Category, type Plugin, type PluginContext } from "../core/Extensions.js";

export interface PluginPackage {
  manifest: {
    name: string;
    contributes?: Partial<Record<Category, readonly string[]>>;
  };
  plugin: Plugin;
  options?: unknown;
}

interface ConfigEntry {
  module: string;
  enabled?: boolean;
  options?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readConfig(file: string): ConfigEntry[] {
  const config: unknown = JSON.parse(readFileSync(file, "utf8"));
  if (!isRecord(config) || !Array.isArray(config.plugins)) throw new Error("invalid plugins");
  return config.plugins.map((entry: unknown) => {
    if (!isRecord(entry) || typeof entry.module !== "string" || !entry.module.trim()
      || ("enabled" in entry && typeof entry.enabled !== "boolean")) {
      throw new Error("invalid plugin entry");
    }
    return { module: entry.module, enabled: entry.enabled as boolean | undefined, options: entry.options };
  });
}

function manifestFor(entry: string): PluginPackage["manifest"] {
  let directory = dirname(fileURLToPath(entry));
  for (;;) {
    const file = join(directory, "package.json");
    if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8")) as PluginPackage["manifest"];
    const parent = dirname(directory);
    if (parent === directory) throw new Error("missing package.json");
    directory = parent;
  }
}

function pluginUrl(specifier: string, configFile: string): string {
  const parent = pathToFileURL(configFile);
  if (specifier.startsWith("./") || specifier.startsWith("../") || isAbsolute(specifier)) {
    const file = resolve(dirname(configFile), specifier);
    if (!existsSync(file)) throw new EditorError(`plugin not found: ${specifier}`);
    if (statSync(file).isDirectory()) {
      return pathToFileURL(createRequire(parent).resolve(file)).href;
    }
    return pathToFileURL(file).href;
  }
  const url = resolveModule(specifier, parent.href);
  if (!url.startsWith("file:")) throw new Error("plugin must resolve to a file");
  if (!existsSync(fileURLToPath(url))) throw new Error("plugin entry file is missing");
  return url;
}

function describe(contributions: Partial<Record<Category, readonly string[]>>): string {
  return categories.flatMap((category) =>
    [...new Set(contributions[category])].sort().map((name) => `${category}/${name}`),
  ).join(", ") || "(none)";
}

function declaredContributions(value: unknown): Partial<Record<Category, readonly string[]>> {
  if (value === undefined) return {};
  if (!isRecord(value)) throw new Error("invalid contributes");
  for (const [category, names] of Object.entries(value)) {
    if (!categories.includes(category as Category) || !Array.isArray(names)
      || names.some((name: unknown) => typeof name !== "string" || !name.trim())) {
      throw new Error("invalid contributes");
    }
  }
  return value;
}

function reason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class PluginLoader {
  constructor(
    private readonly extensions: Extensions,
    private readonly editor: Editor,
    private readonly report: (message: string) => void,
  ) {}

  async load({ manifest, plugin, options }: PluginPackage): Promise<void> {
    const staged = new Extensions();
    let registrationError: unknown;
    let active = true;
    const context: PluginContext = {
      getDocument: () => this.editor.getDocument(),
      register: (category, name, implementation) => {
        if (!active) throw new EditorError("plugin registration is only allowed during activation");
        try {
          if (!categories.includes(category) || typeof name !== "string" || !name.trim()) {
            throw new Error("invalid registration");
          }
          if (this.extensions[category].has(name)) {
            throw new EditorError(`duplicate registration: ${category}/${name}`);
          }
          staged.register(category, name, implementation);
        } catch (error) {
          registrationError ??= error;
          throw error;
        }
      },
    };
    try {
      try {
        await plugin.activate(context, options);
      } finally {
        active = false;
      }
      if (registrationError) throw registrationError;

      const registered = describe({
        shapes: [...staged.shapes.keys()],
        commands: [...staged.commands.keys()],
        decorators: [...staged.decorators.keys()],
        attributes: [...staged.attributes.keys()],
      });
      let declared: string;
      try {
        declared = describe(declaredContributions(manifest.contributes));
      } catch {
        declared = "(invalid)";
      }
      if (declared === "(invalid)" || declared !== registered) {
        this.report(`error: plugin manifest mismatch: ${manifest.name} (declared: ${declared}, registered: ${registered})`);
        return;
      }
      this.extensions.merge(staged);
    } catch (error) {
      const failure = registrationError ?? error;
      if (failure instanceof EditorError && failure.message.startsWith("error: duplicate registration: ")) {
        this.report(failure.message);
      } else {
        this.report(`error: plugin failed to activate: ${manifest.name} (${reason(failure)})`);
      }
    }
  }

  async loadConfig(path: string): Promise<void> {
    const file = resolve(path);
    let entries: ConfigEntry[];
    try {
      entries = readConfig(file);
    } catch {
      this.report("error: invalid plugin config");
      return;
    }
    for (const entry of entries) {
      if (entry.enabled !== false) await this.loadModule(entry, file);
    }
  }

  private async loadModule(entry: ConfigEntry, configFile: string): Promise<void> {
    let name = entry.module;
    let resolved = false;
    try {
      const url = pluginUrl(entry.module, configFile);
      resolved = true;
      const manifest = manifestFor(url);
      if (typeof manifest.name !== "string" || !manifest.name.trim()) throw new Error("invalid package name");
      name = manifest.name;
      const module: { default?: Plugin } = await import(url);
      if (!Object.hasOwn(module, "default")) {
        this.report(`error: plugin has no default export: ${entry.module}`);
        return;
      }
      await this.load({ manifest, plugin: module.default!, options: entry.options });
    } catch (error) {
      if (error instanceof EditorError && error.message.startsWith("error: plugin not found: ")) {
        this.report(error.message);
      } else if (!resolved && isRecord(error) && error.code === "ERR_MODULE_NOT_FOUND"
        && typeof error.message === "string" && error.message.startsWith("Cannot find package ")) {
        this.report(`error: plugin not found: ${entry.module}`);
      } else {
        this.report(`error: plugin failed to activate: ${name} (${reason(error)})`);
      }
    }
  }
}
