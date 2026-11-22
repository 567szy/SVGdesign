import { registerBuiltinCommands } from "../builtins/commands.js";
import { registerBuiltinShapes } from "../builtins/shapes.js";
import { Repl } from "../cli/Repl.js";
import { CommandFactory } from "../commands/CommandFactory.js";
import { CommandInvoker } from "../commands/CommandInvoker.js";
import { Editor } from "../core/Editor.js";
import { Extensions } from "../core/Extensions.js";
import { SvgReader } from "../io/SvgReader.js";
import { SvgWriter } from "../io/SvgWriter.js";
import { ShapeFactory } from "../shapes/ShapeFactory.js";
import { PluginLoader, type PluginPackage } from "./PluginLoader.js";

const codePlugins: readonly PluginPackage[] = [
  { manifest: statsManifest, plugin: stats },
  { manifest: dirManifest, plugin: dir },
  { manifest: boxManifest, plugin: box },
];

export async function createApp(config?: string, report = console.log): Promise<Repl> {
  const editor = new Editor();
  const extensions = new Extensions();
  const invoker = new CommandInvoker(editor);
  const shapes = new ShapeFactory(extensions.shapes);
  registerBuiltinShapes(extensions);
  registerBuiltinCommands(extensions, editor, invoker, shapes, new SvgReader(shapes), new SvgWriter());

  const loader = new PluginLoader(extensions, editor, report);
  if (config !== undefined) {
    await loader.loadConfig(config);
  } else if (process.env.SVG_EDITOR_BUILTINS_ONLY !== "1") {
    for (const plugin of codePlugins) await loader.load(plugin);
  }
  return new Repl(new CommandFactory(extensions.commands), invoker);
}
import dir from "../../plugins/dir/index.js";
import dirManifest from "../../plugins/dir/package.json" with { type: "json" };
import stats from "../../plugins/stats/index.js";
import statsManifest from "../../plugins/stats/package.json" with { type: "json" };
import box from "../../plugins/box/index.js";
import boxManifest from "../../plugins/box/package.json" with { type: "json" };
