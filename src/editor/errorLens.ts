// 診断のある行に、背景の色と行末のメッセージを出す（Error Lens にあたる表示。Phase 8 作業 5。D-158）
//
// - 診断は rust-analyzer から届き、@codemirror/lsp-client が setDiagnostics でエディタの状態に入れる。
//   その効果（setDiagnosticsEffect）を見て、装飾を作り直す。ほかの編集では、装飾の位置を動かすだけ
// - 出すのはエラーと警告だけ（info・hint は出さない）。行は、診断が始まる位置の行
// - 1 行に複数あれば、いちばん重いもの（同じ重さなら先のもの）の 1 行目と「（ほか N 件）」を出す
import { setDiagnosticsEffect, type Diagnostic } from "@codemirror/lint";
import { StateField, type Text } from "@codemirror/state";
import { Decoration, EditorView, WidgetType, type DecorationSet } from "@codemirror/view";

type Level = "error" | "warning";

// 行末に出すメッセージの長さの上限（文字）
const MAX_MESSAGE = 200;

const lineMarks: Record<Level, Decoration> = {
  error: Decoration.line({ class: "cm-errorLens-line-error" }),
  warning: Decoration.line({ class: "cm-errorLens-line-warning" }),
};

class MessageWidget extends WidgetType {
  constructor(
    readonly level: Level,
    readonly text: string,
  ) {
    super();
  }

  eq(other: MessageWidget) {
    return other.level === this.level && other.text === this.text;
  }

  toDOM() {
    const span = document.createElement("span");
    span.className = `cm-errorLens-message cm-errorLens-message-${this.level}`;
    span.textContent = this.text;
    return span;
  }
}

function levelOf(diagnostic: Diagnostic): Level | null {
  return diagnostic.severity === "error" || diagnostic.severity === "warning" ? diagnostic.severity : null;
}

function firstLine(message: string): string {
  const line = message.split("\n", 1)[0].trim();
  return line.length > MAX_MESSAGE ? `${line.slice(0, MAX_MESSAGE)}…` : line;
}

function build(doc: Text, diagnostics: readonly Diagnostic[]): DecorationSet {
  // 行ごとに、いちばん重いものと件数を数える
  const lines = new Map<number, { level: Level; message: string; from: number; count: number }>();
  for (const diagnostic of diagnostics) {
    const level = levelOf(diagnostic);
    if (!level) {
      continue;
    }
    const from = Math.min(Math.max(diagnostic.from, 0), doc.length);
    const number = doc.lineAt(from).number;
    const current = lines.get(number);
    if (!current) {
      lines.set(number, { level, message: diagnostic.message, from, count: 1 });
      continue;
    }
    current.count += 1;
    const heavier = level === "error" && current.level === "warning";
    const sameAndEarlier = level === current.level && from < current.from;
    if (heavier || sameAndEarlier) {
      current.level = level;
      current.message = diagnostic.message;
      current.from = from;
    }
  }
  const ranges = [];
  for (const [number, item] of lines) {
    const line = doc.line(number);
    const others = item.count > 1 ? `（ほか ${item.count - 1} 件）` : "";
    ranges.push(lineMarks[item.level].range(line.from));
    ranges.push(
      Decoration.widget({ widget: new MessageWidget(item.level, firstLine(item.message) + others), side: 1000 }).range(
        line.to,
      ),
    );
  }
  return Decoration.set(ranges, true);
}

export const errorLens = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, tr) {
    let next = decorations.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setDiagnosticsEffect)) {
        next = build(tr.state.doc, effect.value);
      }
    }
    return next;
  },
  provide: (field) => EditorView.decorations.from(field),
});
