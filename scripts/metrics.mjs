import { execFileSync } from "node:child_process";
import ts from "typescript";

const [base = "final", head = "HEAD"] = process.argv.slice(2);

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

function complexity(path, text) {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  let score = 1;
  function visit(node) {
    if ((ts.isFunctionLike(node) && node.body)
      || ts.isIfStatement(node) || ts.isForStatement(node) || ts.isForInStatement(node)
      || ts.isForOfStatement(node) || ts.isWhileStatement(node) || ts.isDoStatement(node)
      || ts.isCaseClause(node) || ts.isCatchClause(node) || ts.isConditionalExpression(node)) {
      score += 1;
    }
    if (ts.isBinaryExpression(node) && [
      ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken,
    ].includes(node.operatorToken.kind)) {
      score += 1;
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return score;
}

function describe(path) {
  if (path.startsWith("vscode-svg/")) {
    return ["VS Code", path.endsWith("/outline.ts") ? "XML 元素与源码范围" : "宿主扩展注册"];
  }
  if (path.includes("/plugins/")) return ["插件", "可选扩展实现"];
  if (path.startsWith("src/builtins/")) return ["插件", "Phase 1 内置能力注册"];
  if (path.startsWith("src/assembly/") || ["src/index.ts", "src/runTranscript.ts"].includes(path)) {
    return ["装配处", "启动、装配或插件加载"];
  }
  if (path.startsWith("src/commands/")) return ["内核", "命令执行、参数分发或历史"];
  if (path.startsWith("src/shapes/")) return ["内核", "图形领域模型或提供者查询"];
  if (path.startsWith("src/io/")) return ["内核", "SVG 读写和变换"];
  if (path.startsWith("src/cli/")) return ["内核", "命令行交互"];
  return ["内核", "文档模型与扩展契约"];
}

function measure(ref) {
  const result = new Map();
  const paths = git("ls-tree", "-r", "--name-only", ref, "--", "src", "plugins", "vscode-svg/src")
    .trim().split(/\r?\n/).filter((path) =>
      /\.(?:ts|js|mts|mjs|cts|cjs)$/.test(path) && !/\.(?:test|spec|d)\.[^.]+$/.test(path)
      && !/(?:^|\/)(?:node_modules|dist|test|tests)\//.test(path),
    );
  for (const path of paths) {
    const text = git("show", `${ref}:${path}`);
    const lines = text ? text.replace(/\r?\n$/, "").split(/\r?\n/).length : 0;
    result.set(path, { lines, score: complexity(path, text) });
  }
  return result;
}

const previous = measure(base);
const current = measure(head);
const paths = [...new Set([...previous.keys(), ...current.keys()])].sort();
const metrics = { lines: 0, score: 0 };
const groups = ["内核", "装配处", "插件", "VS Code"];
const label = (ref) => `\`${ref}\` (\`${git("rev-parse", "--short", ref).trim()}\`)`;
const delta = (after, before) => `${after - before > 0 ? "+" : ""}${after - before}`;
console.log("# CLI 重构指标\n");
console.log(`${label(base)} → ${label(head)}\n`);
console.log("使用 `npm run metrics -- <基线提交> <目标提交>` 从 Git 对象生成。行数包含空行和注释。圈复杂度按文件汇总，每个模块和每个有实现的函数从 1 起算，条件分支、循环、非 default 的 case、catch 和短路逻辑各加 1。VS Code 单独列出。\n");
console.log("| 分类 | 基线行数 | 目标行数 | 行数增量 | 基线圈复杂度 | 目标圈复杂度 | 圈复杂度增量 |");
console.log("| --- | ---: | ---: | ---: | ---: | ---: | ---: |");
for (const group of groups) {
  const entries = paths.filter((path) => describe(path)[0] === group);
  const sum = (data, metric) => entries.reduce((total, path) => total + (data.get(path) ?? metrics)[metric], 0);
  const [aLines, bLines] = [sum(previous, "lines"), sum(current, "lines")];
  const [aScore, bScore] = [sum(previous, "score"), sum(current, "score")];
  console.log(`| ${group} | ${aLines} | ${bLines} | ${delta(bLines, aLines)} | ${aScore} | ${bScore} | ${delta(bScore, aScore)} |`);
}

console.log("\n| 文件 | 分类 | 职责 | 行数 | 圈复杂度增量 |");
console.log("| --- | --- | --- | ---: | ---: |");
for (const path of paths) {
  const [group, role] = describe(path);
  const from = previous.get(path) ?? metrics;
  const to = current.get(path) ?? metrics;
  console.log(`| \`${path}\` | ${group} | ${role} | ${from.lines} → ${to.lines} | ${delta(to.score, from.score)} |`);
}
