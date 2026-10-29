// フォルダ全体の検索（Rust 側は src-tauri/src/search.rs。Phase 12 作業 2。D-183）
import { invoke } from "@tauri-apps/api/core";
import type { Stamp } from "./workspace";

export type SearchQuery = {
  pattern: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  regex: boolean;
};

// line・column は 1 から（column は行の中の UTF-16 の位置）。preview は見せる行、start・end はその中の当たりの位置
export type LineMatch = { line: number; column: number; preview: string; start: number; end: number };

export type FileMatches = { path: string; stamp: Stamp; matches: LineMatch[] };

export type SearchResult = {
  files: FileMatches[];
  total: number;
  // 上限（2,000 件）で止めた
  truncated: boolean;
  // 読まなかったファイルの数（大きすぎる・文字のファイルでない・読めない）
  skipped: number;
  // 新しい検索が始まったので、途中でやめた（使わない）
  cancelled: boolean;
};

export function searchWorkspace(query: SearchQuery): Promise<SearchResult> {
  return invoke<SearchResult>("search_workspace", { query });
}

// 置換（Phase 12 作業 3。D-184）。targets は検索の結果のファイルと、そのときの更新日時と大きさ
export type ReplaceResult = {
  // 確認のダイアログでキャンセルした
  cancelled: boolean;
  replaced: number;
  files: string[];
  // 検索のあとで変わったので置き換えなかった
  changed: string[];
  // 読めない・書けないなどで置き換えられなかった
  failed: string[];
};

export function replaceInWorkspace(
  query: SearchQuery,
  replacement: string,
  targets: { path: string; stamp: Stamp }[],
): Promise<ReplaceResult> {
  return invoke<ReplaceResult>("replace_in_workspace", { query, replacement, targets });
}

export type UndoResult = { restored: string[]; changed: string[]; failed: string[] };

export function undoReplace(): Promise<UndoResult> {
  return invoke<UndoResult>("undo_replace");
}
