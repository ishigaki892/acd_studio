import type { HistoryEntry, HistoryKind } from "../ipc/history";
import { describeFinish } from "./runLog";

// 下部パネルの「履歴」のタブ（Phase 4a 作業 4。D-137）。今の作業領域の実行履歴を新しい順に並べる

const KIND_LABELS: Record<HistoryKind, string> = {
  run: "実行",
  test: "サンプルテスト",
  partialTest: "サンプルテスト（一部のケース）",
  randomTest: "ランダムテスト",
  interactiveTest: "対話テスト",
  submit: "提出",
};

// 例：2026-10-23 14:05:09（ローカルの時刻）
function formatTime(timeMs: number): string {
  const date = new Date(timeMs);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// 実行時間：通常実行はプログラムの実行時間、サンプルテストは最も長いケース（ユーザーの判断、2026-10-23）
function formatElapsed(entry: HistoryEntry): string {
  const finish = entry.finish;
  if (finish.kind === "ran") {
    return `${finish.elapsedMs} ms`;
  }
  if (
    (finish.kind === "tested" ||
      finish.kind === "randomTested" ||
      finish.kind === "interactiveTested") &&
    finish.maxElapsedMs !== null
  ) {
    return `最長 ${finish.maxElapsedMs} ms`;
  }
  return "—";
}

function targetName(entry: HistoryEntry): string {
  return entry.package === "" || entry.package.split("/").pop() === entry.bin
    ? entry.bin
    : `${entry.package} の ${entry.bin}`;
}

type Props = {
  entries: HistoryEntry[];
  onClear: () => void;
  // 提出の行の「詳細」：公式の提出の詳細をブラウザで開く（Phase 6。D-148 §2.8）
  onOpenSubmission: (contest: string, submissionId: number) => void;
  // 消せない理由（実行中など）。消せるなら null
  clearBlocked: string | null;
};

function HistoryView({ entries, onClear, onOpenSubmission, clearBlocked }: Props) {
  const blocked = clearBlocked ?? (entries.length === 0 ? "履歴がありません" : null);
  return (
    <div className="history">
      <div className="test-note">
        この作業領域の実行履歴（新しい順。すべての作業領域を合わせて 500 件まで）。実行時間はローカルの計測です。
      </div>
      <div className="test-actions">
        <button
          type="button"
          className="case-action"
          aria-disabled={blocked !== null}
          title={blocked ?? "この作業領域の実行履歴を消去します"}
          onClick={() => {
            if (blocked === null) {
              onClear();
            }
          }}
        >
          履歴を消去
        </button>
        {blocked && entries.length > 0 && <span className="test-note">{blocked}</span>}
      </div>
      {entries.length === 0 ? (
        <div className="history-empty">履歴はありません</div>
      ) : (
        <table className="history-table">
          <thead>
            <tr>
              <th>日時</th>
              <th>対象</th>
              <th>種類</th>
              <th>結果</th>
              <th>実行時間</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr key={`${entry.timeMs}-${index}`}>
                <td className="history-time">{formatTime(entry.timeMs)}</td>
                <td>{targetName(entry)}</td>
                <td>{KIND_LABELS[entry.kind]}</td>
                <td>
                  {describeFinish(entry.finish)}
                  {entry.finish.kind === "submitted" && entry.finish.submissionId !== null && (
                    <>
                      {" "}
                      <button
                        type="button"
                        className="location-link"
                        title="公式の提出の詳細をブラウザで開きます"
                        onClick={() => {
                          const finish = entry.finish;
                          if (finish.kind === "submitted" && finish.submissionId !== null) {
                            onOpenSubmission(finish.contest, finish.submissionId);
                          }
                        }}
                      >
                        詳細
                      </button>
                    </>
                  )}
                </td>
                <td className="history-elapsed">{formatElapsed(entry)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default HistoryView;
