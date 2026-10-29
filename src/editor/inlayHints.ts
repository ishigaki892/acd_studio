// インレイヒント（Phase 3b-1 作業 4。AC3b-05）
//
// @codemirror/lsp-client 6.3.0 にはインレイヒントがない（D-122）ので、ライブラリの拡張の仕組み
// （clientCapabilities・editorExtension・client.request・withMapping）の上に書く。
// 文書の変更・表示範囲の変更の少しあとに textDocument/inlayHint を要求し、返ったヒントを
// Decoration.widget で描く。ヒントは文書の内容ではないので、選択・コピー・保存の対象にならない。
// 応答は、要求したときの文書のままで、予約し直されていないときだけ使う（古い応答は捨てる）。
// 編集した行のヒントはすぐ消し、ほかの行のヒントは次の応答まで位置を写して残す（ちらつきを抑える代わりに、
// 編集した行以外の内容が一時的に古いことがある。長くても要求の待ち時間と rust-analyzer の応答までの間）。
// workspace/inlayHint/refresh は扱えない（ライブラリが未知のサーバーの要求に「未実装」と答える）ので、
// 能力は refreshSupport なしで宣言し、rust-analyzer の読み込みが終わったとき（lsp.ts が知らせる）に要求し直す
import { StateEffect, StateField, type Text } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { LSPPlugin, type LSPClientExtension } from "@codemirror/lsp-client";

// 要求するまでの待ち時間（編集が続いている間は待つ）
const REQUEST_DELAY_MS = 500;

// rust-analyzer の読み込みが終わったことを知らせる window のイベント名（lsp.ts が送る）
export const QUIESCENT_EVENT = "lsp-quiescent";

// LSP 3.17 の InlayHint のうち、使う部分だけ
type InlayHint = {
  position: { line: number; character: number };
  label: string | { value: string }[];
  kind?: number; // 1：型、2：引数名
  paddingLeft?: boolean;
  paddingRight?: boolean;
};

const setHints = StateEffect.define<DecorationSet>();

// ヒントの飾り。文書が変わったときは、編集した行のヒントを消し、残りは位置を写して次の応答まで残す
const hintField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    if (tr.docChanged) {
      const before = tr.startState.doc;
      const edited: [number, number][] = [];
      tr.changes.iterChangedRanges((fromA, toA) => {
        edited.push([before.lineAt(fromA).from, before.lineAt(toA).to]);
      });
      value = value
        .update({ filter: (from) => !edited.some(([start, end]) => from >= start && from <= end) })
        .map(tr.changes);
    }
    for (const effect of tr.effects) {
      if (effect.is(setHints)) {
        value = effect.value;
      }
    }
    return value;
  },
  provide: (field) => EditorView.decorations.from(field),
});

class HintWidget extends WidgetType {
  constructor(
    readonly label: string,
    readonly kind: number | undefined,
    readonly paddingLeft: boolean,
    readonly paddingRight: boolean,
  ) {
    super();
  }

  eq(other: HintWidget) {
    return (
      this.label === other.label &&
      this.kind === other.kind &&
      this.paddingLeft === other.paddingLeft &&
      this.paddingRight === other.paddingRight
    );
  }

  toDOM() {
    const span = document.createElement("span");
    const kind = this.kind === 1 ? "type" : this.kind === 2 ? "parameter" : "other";
    span.className = `cm-inlay-hint cm-inlay-hint-${kind}`;
    span.textContent = this.label;
    if (this.paddingLeft) {
      span.style.marginLeft = "0.3em";
    }
    if (this.paddingRight) {
      span.style.marginRight = "0.3em";
    }
    return span;
  }

  // クリックでカーソルの位置が動かないようにする
  ignoreEvent() {
    return true;
  }
}

// サーバーの応答は信用しきらない。使える形のヒントだけを、文書の位置とラベルにして返す
function readHint(value: unknown, doc: Text): { pos: number; hint: InlayHint; label: string } | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const hint = value as InlayHint;
  const { position, label } = hint;
  if (
    typeof position !== "object" ||
    position === null ||
    !Number.isInteger(position.line) ||
    !Number.isInteger(position.character) ||
    position.line < 0 ||
    position.line >= doc.lines
  ) {
    return null;
  }
  const line = doc.line(position.line + 1);
  if (position.character < 0 || position.character > line.length) {
    return null;
  }
  let text: string;
  if (typeof label === "string") {
    text = label;
  } else if (Array.isArray(label) && label.every((part) => typeof part?.value === "string")) {
    text = label.map((part) => part.value).join("");
  } else {
    return null;
  }
  return { pos: line.from + position.character, hint, label: text };
}

const hintPlugin = ViewPlugin.fromClass(
  class {
    private timer: ReturnType<typeof setTimeout> | undefined;
    // 世代番号。要求を予約し直すたびに進め、応答を使う前に確かめる（古い応答は捨てる）
    private serial = 0;
    private destroyed = false;

    constructor(readonly view: EditorView) {
      window.addEventListener(QUIESCENT_EVENT, this.schedule);
      this.schedule();
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.schedule();
      }
    }

    destroy() {
      this.destroyed = true;
      clearTimeout(this.timer);
      window.removeEventListener(QUIESCENT_EVENT, this.schedule);
    }

    private schedule = () => {
      // 飛んでいる要求の応答を、予約した時点で無効にする（文書・表示範囲の変更、読み込みの完了）
      this.serial++;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => void this.request(), REQUEST_DELAY_MS);
    };

    private async request() {
      const { view } = this;
      const plugin = LSPPlugin.get(view);
      if (this.destroyed || !plugin) {
        return;
      }
      const { client, uri } = plugin;
      // まだ初期化が済んでいなければ、済んだときに（読み込みの完了の知らせで）要求し直す
      if (!client.serverCapabilities?.inlayHintProvider) {
        return;
      }
      const serial = this.serial;
      client.sync();
      // 要求した時点の文書。範囲の変換も、応答の位置の変換も、この文書で行う（同期の済んだ文書と同じ）
      const doc = view.state.doc;
      const { from, to } = view.viewport;
      const range = { start: plugin.toPosition(from, doc), end: plugin.toPosition(to, doc) };
      try {
        const hints = await client.request<unknown, unknown>("textDocument/inlayHint", {
          textDocument: { uri },
          range,
        });
        if (this.destroyed || serial !== this.serial || view.state.doc !== doc) {
          return;
        }
        if (hints !== null && !Array.isArray(hints)) {
          throw new Error("インレイヒントの応答が配列ではありません");
        }
        const decorations = [];
        let ignored = 0;
        for (const value of hints ?? []) {
          const read = readHint(value, doc);
          if (!read) {
            ignored++;
            continue;
          }
          decorations.push(
            Decoration.widget({
              widget: new HintWidget(
                read.label,
                read.hint.kind,
                read.hint.paddingLeft === true,
                read.hint.paddingRight === true,
              ),
              side: 1,
            }).range(read.pos),
          );
        }
        if (ignored > 0) {
          console.warn(`[rust-analyzer] 読めないインレイヒントを ${ignored} 件、無視しました`);
        }
        view.dispatch({ effects: setHints.of(Decoration.set(decorations, true)) });
      } catch (e) {
        console.warn("[rust-analyzer] インレイヒントを取得できません", e);
      }
    }
  },
);

const hintTheme = EditorView.baseTheme({
  ".cm-inlay-hint": {
    color: "var(--fg-muted)",
    backgroundColor: "var(--bg-active-line)",
    borderRadius: "3px",
    padding: "0 3px",
    fontSize: "0.85em",
  },
});

export function inlayHints(): LSPClientExtension {
  return {
    // refreshSupport は宣言しない（上のとおり）
    clientCapabilities: { textDocument: { inlayHint: { dynamicRegistration: false } } },
    editorExtension: [hintField, hintPlugin, hintTheme],
  };
}
