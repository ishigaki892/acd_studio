// エディタ（CodeMirror）の画面の文字の日本語（Phase 4a 作業 5。D-137。AC4-09）。
// CodeMirror の各ライブラリは、画面の文字を state.phrase("英語") で出すので、EditorState.phrases で置き換える。
// キーは、ライブラリのソースにある英語の文字列そのもの（node_modules/@codemirror/*/dist/index.js。
// 版は search 6.7.2・language 6.13.1・lint 6.9.7・autocomplete 6.20.3・view 6.43.14・commands 6.11.1・lsp-client 6.3.0）。
// 版を上げて文字列が変わると、英語のまま出る。$ は、ライブラリが数を入れる場所
import { EditorState } from "@codemirror/state";

export const japanesePhrases = EditorState.phrases.of({
  // 検索・置換（@codemirror/search）
  Find: "検索",
  Replace: "置換",
  next: "次へ",
  previous: "前へ",
  all: "すべて選択",
  "match case": "大文字と小文字を区別",
  regexp: "正規表現",
  "by word": "単語単位",
  replace: "置換",
  "replace all": "すべて置換",
  close: "閉じる",
  "Go to line": "行へ移動",
  go: "移動",
  // 読み上げの文（画面には出ない）
  "current match": "現在の一致",
  "on line": "行",
  "replaced $ matches": "$ 件を置換しました",
  "replaced match on line $": "$ 行目を置換しました",
  // 折りたたみ（@codemirror/language）
  "Fold line": "折りたたむ",
  "Unfold line": "展開する",
  "folded code": "折りたたんだコード",
  unfold: "展開",
  "Folded lines": "折りたたんだ行",
  "Unfolded lines": "展開した行",
  to: "から",
  // 診断の一覧（@codemirror/lint。⇧⌘M）
  Diagnostics: "診断",
  "No diagnostics": "診断はありません",
  // 補完（@codemirror/autocomplete）
  Completions: "補完の候補",
  // そのほかの読み上げ（@codemirror/view・@codemirror/commands）
  "Control character": "制御文字",
  "Selection deleted": "選択範囲を削除しました",
  // rust-analyzer とのやり取りの失敗・参照の一覧（@codemirror/lsp-client）。失敗の理由（英語）は、そのまま後ろに付く
  "Formatting request failed": "整形できませんでした",
  "Find definition failed": "定義を探せませんでした",
  "Finding references failed": "参照を探せませんでした",
  "Signature request failed": "引数の情報を取得できませんでした",
  "Rename request failed": "名前を変更できませんでした",
  "Reference list": "参照の一覧",
  "New name": "新しい名前",
  rename: "名前を変更",
});
