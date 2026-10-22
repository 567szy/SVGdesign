export class LineParser {
  parse(line: string): string[] | null {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      return null;
    }
    const tokens: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < trimmed.length; i += 1) {
      const ch = trimmed[i]!;
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (!inQuotes && /\s/.test(ch)) {
        if (current.length > 0) {
          tokens.push(current);
          current = "";
        }
        continue;
      }
      current += ch;
    }
    if (current.length > 0) {
      tokens.push(current);
    }
    return tokens;
  }
}
