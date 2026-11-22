# CLI 重构指标

`final` (`8317c3e`) → `9104bce` (`9104bce`)

使用 `npm run metrics -- <基线提交> <目标提交>` 从 Git 对象生成。行数包含空行和注释。圈复杂度按文件汇总，每个模块和每个有实现的函数从 1 起算，条件分支、循环、非 default 的 case、catch 和短路逻辑各加 1。VS Code 单独列出。

| 分类 | 基线行数 | 目标行数 | 行数增量 | 基线圈复杂度 | 目标圈复杂度 | 圈复杂度增量 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 内核 | 2265 | 2222 | -43 | 504 | 510 | +6 |
| 装配处 | 21 | 271 | +250 | 8 | 95 | +87 |
| 插件 | 0 | 202 | +202 | 0 | 80 | +80 |
| VS Code | 0 | 98 | +98 | 0 | 24 | +24 |

| 文件 | 分类 | 职责 | 行数 | 圈复杂度增量 |
| --- | --- | --- | ---: | ---: |
| `src/assembly/PluginLoader.ts` | 装配处 | 启动、装配或插件加载 | 0 → 194 | +74 |
| `src/assembly/arguments.ts` | 装配处 | 启动、装配或插件加载 | 0 → 19 | +7 |
| `src/assembly/createApp.ts` | 装配处 | 启动、装配或插件加载 | 0 → 30 | +4 |
| `src/builtins/commands.ts` | 插件 | Phase 1 内置能力注册 | 0 → 126 | +37 |
| `src/builtins/shapes.ts` | 插件 | Phase 1 内置能力注册 | 0 → 76 | +43 |
| `src/cli/LineParser.ts` | 内核 | 命令行交互 | 30 → 30 | 0 |
| `src/cli/Repl.ts` | 内核 | 命令行交互 | 65 → 52 | 0 |
| `src/commands/AddToCommand.ts` | 内核 | 命令执行、参数分发或历史 | 44 → 44 | 0 |
| `src/commands/CanvasCommand.ts` | 内核 | 命令执行、参数分发或历史 | 29 → 29 | 0 |
| `src/commands/Command.ts` | 内核 | 命令执行、参数分发或历史 | 8 → 13 | 0 |
| `src/commands/CommandFactory.ts` | 内核 | 命令执行、参数分发或历史 | 138 → 15 | -28 |
| `src/commands/CommandInvoker.ts` | 内核 | 命令执行、参数分发或历史 | 47 → 49 | 0 |
| `src/commands/CreateCommand.ts` | 内核 | 命令执行、参数分发或历史 | 52 → 47 | 0 |
| `src/commands/DeleteCommand.ts` | 内核 | 命令执行、参数分发或历史 | 39 → 39 | 0 |
| `src/commands/GroupCommand.ts` | 内核 | 命令执行、参数分发或历史 | 73 → 74 | +1 |
| `src/commands/HelpCommand.ts` | 内核 | 命令执行、参数分发或历史 | 34 → 16 | +2 |
| `src/commands/InitCommand.ts` | 内核 | 命令执行、参数分发或历史 | 23 → 23 | 0 |
| `src/commands/MoveCommand.ts` | 内核 | 命令执行、参数分发或历史 | 60 → 60 | 0 |
| `src/commands/ReadCommand.ts` | 内核 | 命令执行、参数分发或历史 | 34 → 36 | -1 |
| `src/commands/RedoCommand.ts` | 内核 | 命令执行、参数分发或历史 | 17 → 17 | 0 |
| `src/commands/SaveCommand.ts` | 内核 | 命令执行、参数分发或历史 | 35 → 37 | 0 |
| `src/commands/ScaleCommand.ts` | 内核 | 命令执行、参数分发或历史 | 32 → 32 | 0 |
| `src/commands/SetCommand.ts` | 内核 | 命令执行、参数分发或历史 | 30 → 110 | +19 |
| `src/commands/ShowCommand.ts` | 内核 | 命令执行、参数分发或历史 | 21 → 21 | 0 |
| `src/commands/TreeCommand.ts` | 内核 | 命令执行、参数分发或历史 | 20 → 36 | +6 |
| `src/commands/UndoCommand.ts` | 内核 | 命令执行、参数分发或历史 | 17 → 17 | 0 |
| `src/commands/UngroupCommand.ts` | 内核 | 命令执行、参数分发或历史 | 61 → 63 | 0 |
| `src/commands/ZOrderCommand.ts` | 内核 | 命令执行、参数分发或历史 | 51 → 51 | 0 |
| `src/core/Editor.ts` | 内核 | 文档模型与扩展契约 | 37 → 37 | 0 |
| `src/core/EditorError.ts` | 内核 | 文档模型与扩展契约 | 7 → 7 | 0 |
| `src/core/Extensions.ts` | 内核 | 文档模型与扩展契约 | 0 → 108 | +23 |
| `src/core/Group.ts` | 内核 | 文档模型与扩展契约 | 120 → 126 | +3 |
| `src/core/IdRegistry.ts` | 内核 | 文档模型与扩展契约 | 63 → 75 | +4 |
| `src/core/Shape.ts` | 内核 | 文档模型与扩展契约 | 134 → 148 | +6 |
| `src/core/SvgDocument.ts` | 内核 | 文档模型与扩展契约 | 131 → 133 | 0 |
| `src/index.ts` | 装配处 | 启动、装配或插件加载 | 4 → 10 | +2 |
| `src/io/SvgReader.ts` | 内核 | SVG 读写和变换 | 175 → 177 | 0 |
| `src/io/SvgWriter.ts` | 内核 | SVG 读写和变换 | 7 → 7 | 0 |
| `src/io/Transform.ts` | 内核 | SVG 读写和变换 | 42 → 42 | 0 |
| `src/runTranscript.ts` | 装配处 | 启动、装配或插件加载 | 17 → 18 | 0 |
| `src/shapes/Circle.ts` | 内核 | 图形领域模型或提供者查询 | 83 → 83 | 0 |
| `src/shapes/Ellipse.ts` | 内核 | 图形领域模型或提供者查询 | 88 → 88 | 0 |
| `src/shapes/Line.ts` | 内核 | 图形领域模型或提供者查询 | 90 → 90 | 0 |
| `src/shapes/Rect.ts` | 内核 | 图形领域模型或提供者查询 | 88 → 88 | 0 |
| `src/shapes/ShapeFactory.ts` | 内核 | 图形领域模型或提供者查询 | 159 → 21 | -29 |
| `src/shapes/Text.ts` | 内核 | 图形领域模型或提供者查询 | 81 → 81 | 0 |
| `vscode-svg/src/extension.ts` | VS Code | 宿主扩展注册 | 0 → 58 | +14 |
| `vscode-svg/src/outline.ts` | VS Code | XML 元素与源码范围 | 0 → 40 | +10 |
