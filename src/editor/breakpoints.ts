// ブレークポイントと、デバッグで止まった行の表示（Phase 5 作業 2。D-146 2.6）
//
// - ブレークポイントは、ファイル（作業領域のルートからの相対パス）ごとに、この下の保存の場所（store）が覚える。
//   タブを閉じても残る。保存はしない（アプリを閉じると消える）
// - エディタの状態（EditorState）にも同じものを持たせ、編集で行がずれたら印も一緒に動かす（CodeMirror の位置の対応付け）。
//   エディタで変わったら store に書き、store が変わったら（アダプターが行を動かしたときなど）開いているエディタに入れる
// - 印は行番号の左のガターに出す。クリックか F9 で付け外しする。アダプターが置けなかった印（verified: false）は薄くする
import { RangeSet, StateEffect, StateField, type EditorState, type Extension } from "@codemirror/state";
import { Decoration, EditorView, GutterMarker, gutter, type DecorationSet } from "@codemirror/view";

// 1 つのブレークポイント。verified は、デバッグ中にアダプターが置けたか（デバッグしていないときは null）
export type BreakpointEntry = { line: number; verified: boolean | null };

// ---- 保存の場所 ----

// 変わった理由。user はエディタでの付け外しと編集、adapter はアダプターの答え（行が動いた・置けたか）
export type BreakpointOrigin = "user" | "adapter";
type Listener = (path: string, origin: BreakpointOrigin) => void;

const store = new Map<string, BreakpointEntry[]>();
const listeners = new Set<Listener>();

function sameEntries(a: BreakpointEntry[], b: BreakpointEntry[]): boolean {
  return a.length === b.length && a.every((entry, i) => entry.line === b[i].line && entry.verified === b[i].verified);
}

// 行の順に並べ、同じ行は 1 つにする
function normalize(entries: BreakpointEntry[]): BreakpointEntry[] {
  const byLine = new Map<number, BreakpointEntry>();
  for (const entry of entries) {
    if (entry.line >= 1 && !byLine.has(entry.line)) {
      byLine.set(entry.line, entry);
    }
  }
  return [...byLine.values()].sort((a, b) => a.line - b.line);
}

export function breakpointsOf(path: string): BreakpointEntry[] {
  return store.get(path) ?? [];
}

// ブレークポイントのあるファイルと行（ファイルの名前の順）
export function allBreakpoints(): { path: string; entries: BreakpointEntry[] }[] {
  return [...store.entries()]
    .filter(([, entries]) => entries.length > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, entries]) => ({ path, entries }));
}

export function setBreakpoints(path: string, entries: BreakpointEntry[], origin: BreakpointOrigin) {
  const next = normalize(entries);
  if (sameEntries(next, breakpointsOf(path))) {
    return;
  }
  if (next.length === 0) {
    store.delete(path);
  } else {
    store.set(path, next);
  }
  for (const listener of listeners) {
    listener(path, origin);
  }
}

// すべてのブレークポイントを消す（別のフォルダを開いたとき。Phase 10 作業 3。D-166）
export function clearAllBreakpoints() {
  for (const path of [...store.keys()]) {
    setBreakpoints(path, [], "user");
  }
}

// 1 つの行のブレークポイントを付け外しする（一覧の × など）
export function removeBreakpoint(path: string, line: number) {
  setBreakpoints(
    path,
    breakpointsOf(path).filter((entry) => entry.line !== line),
    "user",
  );
}

// デバッグが終わったら、置けたかの印を消す
export function clearVerified() {
  for (const [path, entries] of [...store.entries()]) {
    setBreakpoints(
      path,
      entries.map((entry) => ({ ...entry, verified: null })),
      "adapter",
    );
  }
}

// ファイルの名前を変えた・消したとき
export function renameBreakpoints(from: string, to: string) {
  const entries = breakpointsOf(from);
  setBreakpoints(from, [], "user");
  if (entries.length > 0) {
    setBreakpoints(to, entries, "user");
  }
}

export function subscribeBreakpoints(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// テスト用：保存の場所を空にする
export function resetBreakpointsForTest() {
  store.clear();
  listeners.clear();
}

// ---- エディタの状態 ----

class BreakpointMarker extends GutterMarker {
  readonly verified: boolean | null;
  // 行の先頭に入れた文字（行頭での改行など）の後ろへ付いていく。コードが下の行へ動いたら、印も一緒に動く。
  // 長さ 0 の範囲は startSide ≤ endSide でないと、対応付けのときに捨てられるので、両方を 1 にする
  startSide = 1;
  endSide = 1;

  constructor(verified: boolean | null) {
    super();
    this.verified = verified;
  }

  eq(other: GutterMarker): boolean {
    return other instanceof BreakpointMarker && other.verified === this.verified;
  }

  toDOM(): Node {
    const dot = document.createElement("span");
    dot.className = this.verified === false ? "cm-breakpoint cm-breakpoint-unverified" : "cm-breakpoint";
    dot.textContent = "●";
    return dot;
  }
}

const MARKERS = {
  null: new BreakpointMarker(null),
  true: new BreakpointMarker(true),
  false: new BreakpointMarker(false),
};

function markerOf(verified: boolean | null): BreakpointMarker {
  return MARKERS[String(verified) as "null" | "true" | "false"];
}

// 行の先頭の位置で付け外しする
const toggleEffect = StateEffect.define<number>({ map: (pos, mapping) => mapping.mapPos(pos) });
// 全部を置き直す（store から入れるとき）
const replaceEffect = StateEffect.define<BreakpointEntry[]>();

function buildSet(state: EditorState, entries: BreakpointEntry[]): RangeSet<BreakpointMarker> {
  const ranges = normalize(entries)
    .filter((entry) => entry.line <= state.doc.lines)
    .map((entry) => markerOf(entry.verified).range(state.doc.line(entry.line).from));
  return RangeSet.of(ranges);
}

export const breakpointField = StateField.define<RangeSet<BreakpointMarker>>({
  create: () => RangeSet.empty,
  update(set, tr) {
    let next = set.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(replaceEffect)) {
        next = buildSet(tr.state, effect.value);
      } else if (effect.is(toggleEffect)) {
        const from = tr.state.doc.lineAt(effect.value).from;
        let has = false;
        next.between(from, from, () => {
          has = true;
        });
        next = has
          ? next.update({ filter: (start) => start !== from })
          : next.update({ add: [markerOf(null).range(from)] });
      }
    }
    return next;
  },
});

// エディタの状態のブレークポイント（1 始まりの行。同じ行は 1 つ）
export function entriesOf(state: EditorState): BreakpointEntry[] {
  const entries: BreakpointEntry[] = [];
  const iter = state.field(breakpointField, false)?.iter();
  if (!iter) {
    return entries;
  }
  for (; iter.value; iter.next()) {
    entries.push({ line: state.doc.lineAt(iter.from).number, verified: iter.value.verified });
  }
  return normalize(entries);
}

// store の内容をエディタの状態に入れる効果。同じなら null
export function syncEffect(state: EditorState, path: string): StateEffect<BreakpointEntry[]> | null {
  if (state.field(breakpointField, false) === undefined) {
    return null;
  }
  const wanted = breakpointsOf(path);
  return sameEntries(entriesOf(state), normalize(wanted)) ? null : replaceEffect.of(wanted);
}

export function toggleAt(pos: number): StateEffect<number> {
  return toggleEffect.of(pos);
}

// 印のない行にも要素を作る（どの行でも、行の高さいっぱいを押せるようにし、マウスを乗せたときに薄い印を出す）
const breakpointGutter = gutter({
  class: "cm-breakpoint-gutter",
  markers: (view) => view.state.field(breakpointField),
  renderEmptyElements: true,
  initialSpacer: () => markerOf(null),
  domEventHandlers: {
    mousedown(view, line) {
      view.dispatch({ effects: toggleEffect.of(line.from) });
      return true;
    },
  },
});

// ---- 止まった行 ----

const stoppedEffect = StateEffect.define<number | null>();
const stoppedLine = Decoration.line({ class: "cm-debug-stopped-line" });

const stoppedField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(set, tr) {
    let next = set.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(stoppedEffect)) {
        const line = effect.value;
        next =
          line === null || line < 1 || line > tr.state.doc.lines
            ? Decoration.none
            : Decoration.set([stoppedLine.range(tr.state.doc.line(line).from)]);
      }
    }
    return next;
  },
  provide: (field) => EditorView.decorations.from(field),
});

// 止まった行（1 始まり。null なら消す）を示す効果。今と同じなら null
export function stoppedLineEffect(state: EditorState, line: number | null): StateEffect<number | null> | null {
  const current = state.field(stoppedField, false);
  if (current === undefined) {
    return null;
  }
  let shown: number | null = null;
  current.between(0, state.doc.length, (from) => {
    shown = state.doc.lineAt(from).number;
  });
  const wanted = line !== null && line >= 1 && line <= state.doc.lines ? line : null;
  return shown === wanted ? null : stoppedEffect.of(wanted);
}

// エディタの拡張。ブレークポイントは、作業領域の中のファイル（読み取り専用でないタブ）にだけ置ける
export function debugExtensions(options: { breakpoints: boolean }): Extension[] {
  return options.breakpoints ? [breakpointField, breakpointGutter, stoppedField] : [stoppedField];
}
