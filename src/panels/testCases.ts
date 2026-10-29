// サンプルテストの結果（ケースの一覧）の扱い（Phase 4a 作業 2。D-137）。
// 一部のケースだけ再実行したとき、実行した分だけを入れ替えて、全体の結果を数え直す
import type { CaseResult, Finish } from "../ipc/run";

// ケース名の並び順の鍵：（種類, 番号）。`sample-N` が先、ランダムテストで保存した `random-N`、
// 対話テストの `interactive-N`（入力のファイルがないときの `interactive` を含む）の順。
// それぞれ番号の順（D-090・D-143・D-144）。ほかの名前は最後
const KIND_ORDER: Record<string, number> = { sample: 0, random: 1, interactive: 2 };

function caseOrder(name: string): [number, number] {
  const match = /^(sample|random|interactive)-(\d+)$/.exec(name);
  if (match) {
    return [KIND_ORDER[match[1]], Number(match[2])];
  }
  return name === "interactive" ? [KIND_ORDER.interactive, 0] : [3, 0];
}

function compareCases(a: CaseResult, b: CaseResult): number {
  const [kindA, numberA] = caseOrder(a.name);
  const [kindB, numberB] = caseOrder(b.name);
  return kindA - kindB || numberA - numberB || a.name.localeCompare(b.name);
}

// 同じ名前のケースがあれば入れ替え、なければ番号の順の位置に入れる
export function mergeCase(cases: CaseResult[], result: CaseResult): CaseResult[] {
  if (cases.some((item) => item.name === result.name)) {
    return cases.map((item) => (item.name === result.name ? result : item));
  }
  return [...cases, result].sort(compareCases);
}

// 「失敗」とみなすケース：WA・RE・TLE・MLE・OLE・出力の全体を得られなかった（D-140）。
// 正解・目視確認・中断・未実行は含めない
export function isFailed(result: CaseResult): boolean {
  switch (result.verdict.kind) {
    case "wrongAnswer":
    case "runtimeError":
    case "timedOut":
    case "memoryLimit":
    case "outputLimit":
    case "outputIncomplete":
      return true;
    default:
      return false;
  }
}

export function failedNames(cases: CaseResult[]): string[] {
  return cases.filter(isFailed).map((item) => item.name);
}

// 対話テストの、今のケースの一覧から全体の結果を数える（一部のケースだけ再実行したとき。Rust 側の数え方と同じ：
// 中断・未実行は失敗に数えない）
export function summarizeInteractive(cases: CaseResult[]): Finish {
  const tested = summarizeCases(cases);
  if (tested.kind !== "tested") {
    return tested;
  }
  return {
    kind: "interactiveTested",
    total: tested.total,
    accepted: tested.accepted,
    failed: tested.failed + tested.unjudged,
    interrupted: tested.interrupted,
    maxElapsedMs: tested.maxElapsedMs,
  };
}

// 今のケースの一覧から全体の結果を数える（Rust 側の数え方と同じ：中断・未実行は不正解に数えない）
export function summarizeCases(cases: CaseResult[]): Finish {
  let accepted = 0;
  let unjudged = 0;
  let failed = 0;
  let interrupted = false;
  let maxElapsedMs: number | null = null;
  for (const item of cases) {
    if (item.verdict.kind !== "interrupted" && item.elapsedMs !== null) {
      maxElapsedMs = Math.max(maxElapsedMs ?? 0, item.elapsedMs);
    }
    switch (item.verdict.kind) {
      case "accepted":
        accepted += 1;
        break;
      case "unjudged":
        unjudged += 1;
        break;
      case "interrupted":
        interrupted = true;
        break;
      case "notRun":
        break;
      default:
        failed += 1;
    }
  }
  return { kind: "tested", total: cases.length, accepted, failed, unjudged, interrupted, maxElapsedMs };
}
