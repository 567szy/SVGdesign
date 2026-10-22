export type CommandKind = "edit" | "io" | "query";

export interface Command {
  readonly name: string;
  readonly kind: CommandKind;
  execute(): string;
  undo(): string;
}
