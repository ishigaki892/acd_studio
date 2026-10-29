import type { EditorState, Text } from "@codemirror/state";

// パンくずリスト（Phase 18 作業 1。D-216）の、カーソルの位置の知らせと Markdown の見出し

export type CursorInfo = { key: string; state: EditorState };

type Listener = (info: CursorInfo | null) => void;

const listeners = new Set<Listener>();
let current: CursorInfo | null = null;

// エディタの状態が変わったとき（カーソルの移動・編集・タブの切り替え）に、エディタが知らせる。
// 知らせを受けるのはパンくずリストだけなので、App 全体は描き直さない
export function publishCursor(info: CursorInfo | null) {
  if (current?.key === info?.key && current?.state === info?.state) {
    return;
  }
  current = info;
  for (const listener of listeners) {
    listener(info);
  }
}

export function subscribeCursor(listener: Listener): () => void {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}

export function isMarkdownPath(path: string): boolean {
  return /\.(md|markdown)$/i.test(path);
}

export type Heading = { level: number; text: string; line: number };

// 見出しの行（ATX。行頭の空白は 3 つまで、# は 1〜6 個、後ろは空白か行末）。末尾の閉じの # は外す
const ATX = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;
// コードの囲みの始まりと終わり（``` か ~~~ を 3 つ以上）
const FENCE = /^ {0,3}(`{3,}|~{3,})/;

// 文書の見出しの一覧（行は 1 始まり）。コードの囲みの中の # は見出しにしない
export function markdownHeadings(lines: Iterable<string>): Heading[] {
  const headings: Heading[] = [];
  let fence: string | null = null;
  let line = 0;
  for (const text of lines) {
    line += 1;
    const opening = FENCE.exec(text);
    if (fence !== null) {
      // 閉じるのは、同じ文字で、開いたものと同じかそれより長い並びだけの行
      if (opening && opening[1][0] === fence[0] && opening[1].length >= fence.length && text.trim() === opening[1]) {
        fence = null;
      }
      continue;
    }
    if (opening && !(opening[1][0] === "`" && text.slice(text.indexOf(opening[1]) + opening[1].length).includes("`"))) {
      fence = opening[1];
      continue;
    }
    const match = ATX.exec(text);
    if (match) {
      const title = (match[2] ?? "").replace(/(?:^|[ \t]+)#+$/, "").trim();
      headings.push({ level: match[1].length, text: title, line });
    }
  }
  return headings;
}

// パンくずリストの記号（Phase 18 作業 2。D-216）。言語サーバーの記号と Markdown の見出しを同じ形にする。
// from・to は範囲（文書の中の位置）、at は移る先（名前の位置）。kind は LSP の SymbolKind（見出しは null）
export type OutlineNode = { name: string; kind: number | null; from: number; to: number; at: number; children: OutlineNode[] };

// 見出しを入れ子にする。見出しの範囲は、次の同じか上の段の見出しの前まで
export function headingOutline(headings: Heading[], doc: Text): OutlineNode[] {
  const roots: OutlineNode[] = [];
  const stack: { level: number; node: OutlineNode }[] = [];
  for (const heading of headings) {
    const from = doc.line(heading.line).from;
    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop()!.node.to = Math.max(from - 1, 0);
    }
    const node: OutlineNode = {
      name: `${"#".repeat(heading.level)} ${heading.text}`.trimEnd(),
      kind: null,
      from,
      to: doc.length,
      at: from,
      children: [],
    };
    (stack.length > 0 ? stack[stack.length - 1].node.children : roots).push(node);
    stack.push({ level: heading.level, node });
  }
  return roots;
}

// 文書（変わらないもの）ごとに見出しを覚えておく。カーソルの移動のたびに読み直さない
const cache = new WeakMap<Text, OutlineNode[]>();

export function headingsOf(doc: Text): OutlineNode[] {
  let outline = cache.get(doc);
  if (!outline) {
    outline = headingOutline(markdownHeadings(doc.iterLines()), doc);
    cache.set(doc, outline);
  }
  return outline;
}

// カーソルの位置を含む記号と、それを囲む記号（外から順に）。各段の兄弟（その段の一覧）もあわせて返す
export type TrailStep = { node: OutlineNode; siblings: OutlineNode[] };

export function outlineTrail(roots: OutlineNode[], pos: number): TrailStep[] {
  const trail: TrailStep[] = [];
  let level = roots;
  for (;;) {
    const node = level.find((n) => n.from <= pos && pos <= n.to);
    if (!node) {
      return trail;
    }
    trail.push({ node, siblings: level });
    level = node.children;
  }
}

type Position = { line: number; character: number };
type Range = { start: Position; end: Position };

function isPosition(value: unknown): value is Position {
  const p = value as Partial<Position> | null;
  return typeof p?.line === "number" && typeof p?.character === "number";
}

function isRange(value: unknown): value is Range {
  const r = value as Partial<Range> | null;
  return isPosition(r?.start) && isPosition(r?.end);
}

// LSP の位置（行と UTF-16 の文字数）を文書の位置にする。文書の外なら null
function offset(doc: Text, p: Position): number | null {
  if (p.line < 0 || p.line >= doc.lines || p.character < 0) {
    return null;
  }
  const line = doc.line(p.line + 1);
  return line.from + Math.min(p.character, line.length);
}

// 記号の数の上限（とても大きいファイルで画面が重くならないように）
const MAX_SYMBOLS = 5000;

// textDocument/documentSymbol の答え（入れ子の DocumentSymbol か、平らな SymbolInformation）を、文書の位置の形にする。
// 読めない項目は飛ばす
export function toOutline(response: unknown, doc: Text): OutlineNode[] {
  let count = 0;
  const convert = (item: unknown, nested: boolean): OutlineNode | null => {
    const s = item as { name?: unknown; kind?: unknown; range?: unknown; selectionRange?: unknown; children?: unknown; location?: { range?: unknown } };
    const range = nested ? s.range : s.location?.range;
    if (count >= MAX_SYMBOLS || typeof s?.name !== "string" || typeof s.kind !== "number" || !isRange(range)) {
      return null;
    }
    const from = offset(doc, range.start);
    const to = offset(doc, range.end);
    if (from === null || to === null || to < from) {
      return null;
    }
    count += 1;
    const at = isRange(s.selectionRange) ? offset(doc, s.selectionRange.start) : null;
    const children = nested && Array.isArray(s.children) ? convertAll(s.children, true) : [];
    return { name: s.name, kind: s.kind, from, to, at: at ?? from, children };
  };
  const convertAll = (items: unknown[], nested: boolean): OutlineNode[] =>
    items.map((item) => convert(item, nested)).filter((node): node is OutlineNode => node !== null).sort((a, b) => a.from - b.from);
  if (!Array.isArray(response)) {
    return [];
  }
  const nested = response.some((item) => typeof item === "object" && item !== null && "range" in item);
  const nodes = convertAll(response, nested);
  return nested ? nodes : nestByRange(nodes);
}

// 平らな一覧を、範囲の包含で入れ子にする（SymbolInformation のとき）
function nestByRange(nodes: OutlineNode[]): OutlineNode[] {
  const sorted = [...nodes].sort((a, b) => a.from - b.from || b.to - a.to);
  const roots: OutlineNode[] = [];
  const stack: OutlineNode[] = [];
  for (const node of sorted) {
    while (stack.length > 0 && stack[stack.length - 1].to < node.to) {
      stack.pop();
    }
    (stack.length > 0 ? stack[stack.length - 1].children : roots).push(node);
    stack.push(node);
  }
  return roots;
}
