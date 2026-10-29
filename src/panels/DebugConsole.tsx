// 下部パネルの「デバッグコンソール」タブ（原典 §4.7・§8.1、D-043、Phase 5 作業 3。D-145 の 3・D-146 2.8）。
// プログラムの出力・LLDB の警告・終了コードを出し、一番下の入力欄から、選んでいるフレームで式や LLDB のコマンドを評価する。
// 入力欄は、止まっているときだけ使える。対話型ターミナル（シェル）ではない（D-145。原典 §4.7）
import { useEffect, useRef, useState } from "react";
import type { ConsoleEntry } from "./debugView";

type Props = {
  // null ならまだデバッグしていない
  entries: ConsoleEntry[] | null;
  // 入力欄を使えない理由。使えるなら null
  inputBlocked: string | null;
  onEvaluate: (expression: string) => void;
};

// 式やコマンドが利用者の権限で動くことの注意（D-145 の 3。docs/phase5/01-pre-start-research.md §8）
export const CONSOLE_NOTICE =
  "ここに打った式やコマンドは、デバッグしているプログラムと LLDB の中で、あなたの権限で実行されます";

function DebugConsole({ entries, inputBlocked, onEvaluate }: Props) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  // 新しい行が来たら、一番下まで送る
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [entries]);

  return (
    <div className="debug-console">
      <div className="debug-console-output">
        {entries === null || entries.length === 0 ? (
          <div className="panel-empty">
            {entries === null
              ? "まだデバッグしていません。プログラムの出力と、式の評価の結果がここに出ます"
              : "出力はまだありません"}
          </div>
        ) : (
          <pre className="run-log">
            {entries.map((entry, i) => (
              <span key={i} className={`console-${entry.kind}`}>
                {entry.kind === "input" ? `> ${entry.text}\n` : entry.text}
              </span>
            ))}
          </pre>
        )}
        <div ref={endRef} />
      </div>
      <form
        className="debug-console-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (inputBlocked !== null || draft.trim() === "") {
            return;
          }
          onEvaluate(draft);
          setDraft("");
        }}
      >
        <input
          type="text"
          value={draft}
          disabled={inputBlocked !== null}
          placeholder={inputBlocked ?? "式（例：n * 2、a[0]）か、` を付けた LLDB のコマンド（例：`bt）を打って Enter"}
          aria-label="デバッグコンソールに式やコマンドを打つ"
          onChange={(event) => setDraft(event.target.value)}
        />
        <div className="debug-console-notice">{CONSOLE_NOTICE}</div>
      </form>
    </div>
  );
}

export default DebugConsole;
