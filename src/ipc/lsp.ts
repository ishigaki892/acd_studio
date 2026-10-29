// 言語サーバー（rust-analyzer・clangd・basedpyright）の起動・送信・停止のコマンドの呼び出し（Rust 側は src-tauri/src/lsp.rs。Phase 3b-1。D-123。clangd は Phase 17 作業 5。D-210。basedpyright は Phase 20 作業 5。D-225）
import { Channel, invoke } from "@tauri-apps/api/core";

export type LspEvent =
  // サーバーからのメッセージ（JSON の文字列。見出しは外してある）
  | { kind: "message"; text: string }
  // サーバーの標準エラー
  | { kind: "log"; text: string }
  // サーバーが終わった（止めた場合も含む）。code は終了コード（シグナルなら null）
  | { kind: "exited"; code: number | null };

export type Started = {
  // 作業領域のルートからのパッケージの相対パス（ルート自身なら空）
  package: string;
  // パッケージのディレクトリの file: の URI
  rootUri: string;
  // すでに同じパッケージで動いていた（channel は使われない）
  alreadyRunning: boolean;
  // サーバーの名前（"rust-analyzer"・"clangd"・"basedpyright"）
  server: string;
};

// path（作業領域のルートからの相対パス）の最寄りのパッケージで起動する（D-124）。.rs は Cargo.toml のパッケージで
// rust-analyzer を、C++ のファイルは main.cpp のパッケージで clangd を、.py は main.py のパッケージで basedpyright を動かす（D-210・D-225）。
// 起動しないファイル（そのほかのファイル、パッケージの外）なら null。
// チャンネルは呼び出しごとに新しく作る（Tauri は呼び出しごとに番号を 0 から振り直すため）
export function lspStart(path: string, session: string, channel: Channel<LspEvent>) {
  return invoke<Started | null>("lsp_start", { path, session, onEvent: channel });
}

// メッセージを 1 つ送る
export function lspSend(message: string) {
  return invoke<void>("lsp_send", { message });
}

// 言語サーバーが返した場所（file: の URI）を、作業領域の中のファイルなら、ルートからの相対パスにする。
// 外・ない・フォルダなら null（定義ジャンプ・参照検索。Phase 3b-2 作業 4）
export function lspLocate(uri: string) {
  return invoke<string | null>("lsp_locate", { uri });
}

// 止める（開発者ツールから呼ぶこともできる。D-126）
export function lspStop() {
  return invoke<void>("lsp_stop");
}
