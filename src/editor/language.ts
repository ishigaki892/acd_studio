// ファイルの言語の見分け（Phase 16 作業 1。D-207。Phase 17 作業 5 で lsp.ts からも使うため Editor.tsx から分けた。D-210）

// C++ として扱うファイルの拡張子。ほかのファイルは今までどおり Rust として色分けする
const CPP_EXTENSIONS = [".cpp", ".cc", ".cxx", ".hpp", ".hh", ".h"];

export function isCppPath(path: string): boolean {
  const lower = path.toLowerCase();
  return CPP_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

// Python のファイル（Phase 19 作業 1。D-222）
export function isPythonPath(path: string): boolean {
  return path.toLowerCase().endsWith(".py");
}
