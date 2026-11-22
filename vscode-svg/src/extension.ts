import * as vscode from "vscode";
import { parseSvgOutline, type SvgElement } from "./outline";

class SvgFileDecorationProvider implements vscode.FileDecorationProvider {
  async provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken) {
    if (!/\.svg$/i.test(uri.path) || token.isCancellationRequested) return;

    let stat: vscode.FileStat;
    try {
      stat = await vscode.workspace.fs.stat(uri);
    } catch {
      // The resource may have disappeared while Explorer was refreshing.
      return;
    }
    if (token.isCancellationRequested || !(stat.type & vscode.FileType.File)) return;
    return new vscode.FileDecoration("[]", "SVG file");
  }
}

class SvgDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken) {
    if (token.isCancellationRequested) return [];
    const roots = parseSvgOutline(document.getText());
    const symbols: vscode.DocumentSymbol[] = [];
    const pending = [{ elements: roots, destination: symbols }];
    while (pending.length > 0) {
      const { elements, destination } = pending.pop()!;
      for (const element of elements) {
        const symbol = this.toSymbol(document, element);
        destination.push(symbol);
        pending.push({ elements: element.children, destination: symbol.children });
      }
    }
    return symbols;
  }

  private toSymbol(document: vscode.TextDocument, element: SvgElement) {
    const start = document.positionAt(element.start);
    return new vscode.DocumentSymbol(
      element.name,
      "",
      element.children.length ? vscode.SymbolKind.Namespace : vscode.SymbolKind.Field,
      new vscode.Range(start, document.positionAt(element.end)),
      new vscode.Range(start, document.positionAt(element.nameEnd)),
    );
  }
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.registerFileDecorationProvider(new SvgFileDecorationProvider()),
    vscode.languages.registerDocumentSymbolProvider(
      { pattern: "**/*.[sS][vV][gG]" },
      new SvgDocumentSymbolProvider(),
      { label: "SVG" },
    ),
  );
}
