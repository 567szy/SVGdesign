export class EditorError extends Error {
  constructor(message: string) {
    const text = message.startsWith("error:") ? message : `error: ${message}`;
    super(text);
    this.name = "EditorError";
  }
}
