// 行頭のインデントを段ごとに塗る（indent-rainbow にあたる表示。Phase 8 作業 5。D-158）
//
// - 1 段は 4 スペース、またはタブ 1 つ。4 つの色（tokens.css の --indent-rainbow-1〜4）を順に繰り返す
// - 4 に足りない残り（ブロックコメントの " * " など）は塗らない
// - 塗るのは画面に見えている範囲だけ（大きなファイルでも重くしないため）
import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, ViewPlugin, type DecorationSet, type EditorView, type ViewUpdate } from "@codemirror/view";

const COLORS = 4;
const levelMarks = Array.from({ length: COLORS }, (_, index) =>
  Decoration.mark({ class: `cm-indent-rainbow-${index + 1}` }),
);

function build(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;
  // 折りたたみなどで、見えている範囲が同じ行に 2 つあるときに、同じ行を二度塗らない
  let lastLine = 0;
  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = doc.lineAt(pos);
      pos = line.to + 1;
      if (line.number <= lastLine) {
        continue;
      }
      lastLine = line.number;
      const text = line.text;
      let index = 0;
      let level = 0;
      while (index < text.length) {
        const width = text[index] === "\t" ? 1 : text.startsWith("    ", index) ? 4 : 0;
        if (width === 0) {
          break;
        }
        builder.add(line.from + index, line.from + index + width, levelMarks[level % COLORS]);
        index += width;
        level += 1;
      }
    }
  }
  return builder.finish();
}

export const indentRainbow = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = build(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = build(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);
