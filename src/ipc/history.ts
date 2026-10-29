// 実行履歴のコマンドの呼び出し（Rust 側は src-tauri/src/history.rs。Phase 4a 作業 4。D-137）
import { invoke } from "@tauri-apps/api/core";
import type { Finish } from "./run";

// run：通常実行、test：サンプルテスト（全ケース）、partialTest：一部のケースだけのサンプルテスト、
// randomTest：ランダムテスト（Phase 4b）、interactiveTest：対話テスト（Phase 4c）、submit：AtCoder への提出（Phase 6）
export type HistoryKind = "run" | "test" | "partialTest" | "randomTest" | "interactiveTest" | "submit";

export type HistoryEntry = {
  // 始めた時刻（UNIX 時間のミリ秒）
  timeMs: number;
  package: string;
  bin: string;
  kind: HistoryKind;
  finish: Finish;
};

// 今の作業領域の実行履歴（新しい順）
export function loadHistory(): Promise<HistoryEntry[]> {
  return invoke<HistoryEntry[]>("load_history");
}

// 今の作業領域の実行履歴を消す。確認の画面は Rust 側で出す。消したら true
export function clearHistory(): Promise<boolean> {
  return invoke<boolean>("clear_history");
}
