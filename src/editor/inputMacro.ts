// 作った input! の中身で、開いているタブの solve()・main() の input! を置き換える（Phase 15 作業 2。D-195）。
// 構文木（Lezer）から `fn solve` の中の最初の `input! { … }` を探し、`{ }` の中身を置き換える。
// エディタの編集として行う（1 回の ⌘Z で戻せる。保存は自動保存のまま）
import { isolateHistory } from "@codemirror/commands";
import { ensureSyntaxTree } from "@codemirror/language";
import type { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

// 構文木の型（@lezer/common は直接の依存にしないので、@codemirror/language の戻り値から取る）
type Tree = NonNullable<ReturnType<typeof ensureSyntaxTree>>;
type SyntaxNode = Tree["topNode"];
type InputMacro = { macro: SyntaxNode; open: SyntaxNode; close: SyntaxNode };

const INDENT = "    ";

export type ReplaceResult = { ok: boolean; message: string };

function text(state: EditorState, node: SyntaxNode) {
  return state.sliceDoc(node.from, node.to);
}

// 名前が name の関数（最初のもの）
function findFunction(tree: Tree, state: EditorState, name: string): SyntaxNode | null {
  let found: SyntaxNode | null = null;
  tree.iterate({
    enter(node) {
      if (found) {
        return false;
      }
      if (node.name === "FunctionItem") {
        const id = node.node.getChild("BoundIdentifier");
        if (id && text(state, id) === name) {
          found = node.node;
          return false;
        }
      }
      return undefined;
    },
  });
  return found;
}

// 関数の中の最初の `input! { … }` の `{` と `}`。なければ null
function findInputMacro(fn: SyntaxNode, state: EditorState): InputMacro | null {
  const block = fn.getChild("Block");
  if (!block) {
    return null;
  }
  // block の中を文書の順にたどる
  const cursor = block.cursor();
  while (cursor.next() && cursor.from < block.to) {
    if (cursor.name !== "MacroInvocation") {
      continue;
    }
    const macro = cursor.node;
    const name = macro.getChild("Identifier");
    const braced = macro.getChild("BracedTokens");
    if (!name || !braced || text(state, name) !== "input") {
      continue;
    }
    const open = braced.firstChild;
    const close = braced.lastChild;
    // 閉じていない input! { は使わない
    if (open?.name === "{" && close?.name === "}" && close.from > open.from) {
      return { macro, open, close };
    }
  }
  return null;
}

// main() の中の solve() の呼び出し。direct は Block の直下の `solve();`（その ExpressionStatement）。
// anywhere は、for などの中も含めてどこかで呼んでいるか
function findSolveCall(fn: SyntaxNode, state: EditorState): { direct: SyntaxNode | null; anywhere: boolean } {
  const block = fn.getChild("Block");
  if (!block) {
    return { direct: null, anywhere: false };
  }
  let anywhere = false;
  const cursor = block.cursor();
  while (cursor.next() && cursor.from < block.to) {
    if (cursor.name !== "CallExpression") {
      continue;
    }
    const call = cursor.node;
    const callee = call.firstChild;
    if (!callee || callee.name !== "Identifier" || text(state, callee) !== "solve") {
      continue;
    }
    anywhere = true;
    const statement = call.parent;
    const parent = statement?.parent;
    if (
      statement?.name === "ExpressionStatement" &&
      parent?.name === "Block" &&
      parent.from === block.from &&
      parent.to === block.to
    ) {
      return { direct: statement, anywhere };
    }
  }
  return { direct: null, anywhere };
}

// 行頭の空白
function indentAt(state: EditorState, pos: number) {
  return /^\s*/.exec(state.doc.lineAt(pos).text)?.[0] ?? "";
}

type Change = { from: number; to?: number; insert: string };

// fn の input! の中身を lines にする変更。input! がなければ、fn の `{` の直後に input! を入れる
function changeFor(fn: SyntaxNode, state: EditorState, lines: string[]): { change: Change; inserted: boolean } | null {
  const found = findInputMacro(fn, state);
  if (found) {
    const base = indentAt(state, found.macro.from);
    const inner = base + INDENT;
    return {
      change: {
        from: found.open.to,
        to: found.close.from,
        insert: `\n${lines.map((line) => inner + line).join("\n")}\n${base}`,
      },
      inserted: false,
    };
  }
  const open = fn.getChild("Block")?.firstChild;
  if (!open || open.name !== "{") {
    return null;
  }
  const base = indentAt(state, fn.from) + INDENT;
  const body = lines.map((line) => base + INDENT + line).join("\n");
  return { change: { from: open.to, insert: `\n${base}input! {\n${body}\n${base}}` }, inserted: true };
}

export type InputPlan =
  | { ok: false; message: string }
  | { ok: true; changes: Change[]; scrollTo: number; message: string };

// solve() の input! を solve の行に、テストケースが複数なら main() の input! を main の行にする変更を決める。
// mainLoop（設定。D-197）なら、main() に input! がなくても入れ、直下の solve(); を for _ in 0..t { solve(); } にする
export function planInputMacros(
  state: EditorState,
  solve: string[],
  main: string[] | null,
  mainLoop = false,
): InputPlan {
  const tree = ensureSyntaxTree(state, state.doc.length, 1000);
  if (!tree) {
    return { ok: false, message: "構文の読み取りが終わっていません。少し待ってからもう一度押してください" };
  }
  const solveFn = findFunction(tree, state, "solve");
  if (!solveFn) {
    return { ok: false, message: "fn solve が見つかりません。「コピー」で写して貼ってください" };
  }
  const solveChange = changeFor(solveFn, state, solve);
  if (!solveChange) {
    return { ok: false, message: "fn solve の中身を読めません。「コピー」で写して貼ってください" };
  }
  const changes: Change[] = [solveChange.change];
  const messages = [
    solveChange.inserted ? "solve() の先頭に input! を入れました" : "solve() の input! を置き換えました",
  ];
  if (main && mainLoop) {
    const mainFn = findFunction(tree, state, "main");
    const count = main[0]?.split(":")[0]?.trim() || "t";
    if (!mainFn) {
      messages.push(`fn main が見つからないので、main() は変えていません`);
    } else {
      const inputChange = changeFor(mainFn, state, main);
      if (inputChange) {
        changes.push(inputChange.change);
      }
      const didInput = inputChange?.inserted
        ? "main() の先頭に input! を入れました"
        : "main() の input! を置き換えました";
      const call = findSolveCall(mainFn, state);
      if (call.direct) {
        const base = indentAt(state, call.direct.from);
        changes.push({
          from: call.direct.from,
          to: call.direct.to,
          insert: `for _ in 0..${count} {\n${base}${INDENT}solve();\n${base}}`,
        });
        messages.push(`${didInput}。main() の solve(); を for _ in 0..${count} にしました`);
      } else if (call.anywhere) {
        messages.push(`${didInput}（solve() はすでに for などの中で呼んでいるので、そのままにしました）`);
      } else {
        messages.push(`${didInput}。main() に solve() の呼び出しがないので、for は書いていません`);
      }
    }
  } else if (main) {
    const mainFn = findFunction(tree, state, "main");
    const mainChange = mainFn && findInputMacro(mainFn, state) ? changeFor(mainFn, state, main) : null;
    if (mainChange) {
      changes.push(mainChange.change);
      messages.push(
        "main() の input! を置き換えました。solve() をテストケースの数だけ呼ぶ for がなければ書いてください（for _ in 0..t { solve(); }）",
      );
    } else {
      messages.push(
        "main() に input! がないので、main() は変えていません。main() に input! { t: usize } と for _ in 0..t { solve(); } を書いてください",
      );
    }
  }
  return { ok: true, changes, scrollTo: solveChange.change.from, message: messages.join("。") };
}

// 文書を text にする（C++ の入力のコード。Rust 側が書いた結果。D-213）。変わったところだけを 1 つの変更にし、
// 1 回の ⌘Z で戻せるようにする。変わらなければ何もしない
export function replaceDocument(view: EditorView, text: string) {
  const doc = view.state.doc.toString();
  if (doc === text) {
    return;
  }
  let start = 0;
  while (start < doc.length && start < text.length && doc[start] === text[start]) {
    start++;
  }
  let end = 0;
  while (
    end < doc.length - start &&
    end < text.length - start &&
    doc[doc.length - 1 - end] === text[text.length - 1 - end]
  ) {
    end++;
  }
  // サロゲートペアの間で切らない
  const isHigh = (code: number) => code >= 0xd800 && code <= 0xdbff;
  if (start > 0 && isHigh(doc.charCodeAt(start - 1))) {
    start--;
  }
  if (end > 0 && isHigh(doc.charCodeAt(doc.length - end - 1))) {
    end--;
  }
  view.dispatch({
    changes: { from: start, to: doc.length - end, insert: text.slice(start, text.length - end) },
    annotations: isolateHistory.of("full"),
    userEvent: "input",
    effects: EditorView.scrollIntoView(start, { y: "center" }),
  });
  view.focus();
}

// 決めた変更を、エディタの編集として行う（1 回の ⌘Z で戻せるように、前後の編集とまとめない）
export function replaceInputMacros(
  view: EditorView,
  solve: string[],
  main: string[] | null,
  mainLoop: boolean,
): ReplaceResult {
  const plan = planInputMacros(view.state, solve, main, mainLoop);
  if (!plan.ok) {
    return plan;
  }
  view.dispatch({
    changes: plan.changes,
    annotations: isolateHistory.of("full"),
    userEvent: "input",
    effects: EditorView.scrollIntoView(plan.scrollTo, { y: "center" }),
  });
  view.focus();
  return { ok: true, message: plan.message };
}
