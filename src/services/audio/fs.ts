/** Minimal synchronous file system port; the app wires it to expo-file-system. */
export interface Fs {
  exists(path: string): boolean;
  readText(path: string): string;
  writeText(path: string, text: string): void;
  /** Moves a file, replacing the destination. */
  move(from: string, to: string): void;
  /** Entry names (not paths) in a directory; empty when it does not exist. */
  list(dir: string): string[];
  makeDir(path: string): void;
  size(path: string): number;
  /**
   * Deletes a file. Only `releaseRecordedFiles` uses it, for intermediate files
   * whose content is in a final file already checked (D-021).
   */
  remove(path: string): void;
}

export function joinPath(...parts: string[]): string {
  return parts
    .map((part, index) => (index === 0 ? part.replace(/\/+$/, '') : part.replace(/^\/+|\/+$/g, '')))
    .join('/');
}
