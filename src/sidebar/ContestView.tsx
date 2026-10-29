// サイドバーの「コンテスト」（Phase 18 作業 4。D-218。docs/phase18/05-contest-plan.md）。
// 問題文の欄の問題のコンテストについて、問題ごとに AC・最後の判定・回数を出す。
// 読むのは、開いたとき（前に読んでから 1 分たっていれば）・コンテストが替わったとき・「更新」・ログインしたときだけ。
// IDE から出した提出は、通信せずに行に重ねる（判定を追っている間も、その表記を出す）
import { useEffect, useRef, useState } from "react";
import type { ProblemId } from "../ipc/problem";
import { contestStatus, openSubmissionPage, type ContestStatus, type SubmissionView } from "../ipc/submit";
import { overlaySubmissions } from "./contestStatus";

// 開き直したときに読み直すまでの間
const STALE_MS = 60_000;

type Props = {
  // 問題文の欄の問題のコンテスト。なければ null
  contest: string | null;
  // 問題文の欄の問題（その行を強調する）
  currentTask: string | null;
  // サイドバーで「コンテスト」を出している
  visible: boolean;
  loggedIn: boolean;
  // このアプリで出した提出
  submissions: SubmissionView[];
  onSelectTask: (id: ProblemId) => void;
  onLogin: () => void;
};

type Entry = {
  status: ContestStatus | null;
  // 最後に読もうとしたときの知らせ
  error: string | null;
  notLoggedIn: boolean;
  // 最後に読もうとした時刻（ミリ秒）
  triedAt: number;
};

// コンテストごとに覚えておく（サイドバーを切り替えても、読み直さずに出す）
const cache = new Map<string, Entry>();

function clock(ms: number): string {
  const date = new Date(ms);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function ContestView({ contest, currentTask, visible, loggedIn, submissions, onSelectTask, onLogin }: Props) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(false);
  // 読む順番（遅れて届いた、前のコンテストの結果を使わない）
  const seq = useRef(0);

  async function read(target: string) {
    const mine = ++seq.current;
    setLoading(true);
    const previous = cache.get(target)?.status ?? null;
    let next: Entry;
    try {
      const outcome = await contestStatus(target);
      next =
        outcome.kind === "read"
          ? { status: outcome.status, error: null, notLoggedIn: false, triedAt: Date.now() }
          : outcome.kind === "notLoggedIn"
            ? { status: previous, error: null, notLoggedIn: true, triedAt: Date.now() }
            : { status: previous, error: outcome.message, notLoggedIn: false, triedAt: Date.now() };
    } catch (e) {
      next = { status: previous, error: String(e), notLoggedIn: false, triedAt: Date.now() };
    }
    cache.set(target, next);
    if (mine === seq.current) {
      setEntry(next);
      setLoading(false);
    }
  }

  // 開いたとき・コンテストが替わったとき。前に読んでから 1 分たっていなければ、覚えているものを出す
  useEffect(() => {
    if (!visible || !contest) {
      return;
    }
    const cached = cache.get(contest);
    if (cached && Date.now() - cached.triedAt < STALE_MS) {
      seq.current += 1;
      setEntry(cached);
      setLoading(false);
      return;
    }
    setEntry(cached ?? null);
    void read(contest);
  }, [visible, contest]);

  // ログインしたら、ログインを促していたときだけ読み直す
  useEffect(() => {
    if (loggedIn && visible && contest && entry?.notLoggedIn) {
      void read(contest);
    }
  }, [loggedIn]);

  if (!contest) {
    return (
      <div className="contest-view">
        <div className="sidebar-title">コンテスト</div>
        <p className="contest-note">問題文の欄で問題を選ぶと、そのコンテストの提出状況が出ます。</p>
      </div>
    );
  }
  const status = entry?.status && entry.status.contest === contest ? entry.status : null;
  const tasks = status ? overlaySubmissions(status.tasks, contest, submissions) : [];
  return (
    <div className="contest-view">
      <div className="contest-header">
        <span className="sidebar-title contest-title">{contest} の提出状況</span>
        <button type="button" className="contest-refresh" disabled={loading} onClick={() => void read(contest)}>
          更新
        </button>
      </div>
      <div className="contest-meta">
        {loading ? "読んでいます…" : status ? `${clock(status.readAtMs)} に読みました` : ""}
        {status?.truncated && `（新しい ${status.pages} ページ分だけを見ました）`}
      </div>
      {entry?.notLoggedIn && (
        <div className="contest-login">
          <p className="contest-note">ログインすると提出状況が出ます。</p>
          <button type="button" className="settings-button" onClick={onLogin}>
            ログイン
          </button>
        </div>
      )}
      {entry?.error && (
        <p className="contest-error" role="alert">
          {entry.error}
        </p>
      )}
      <ul className="contest-tasks">
        {tasks.map((task) => {
          const mark = task.accepted ? "✓" : task.count > 0 ? "✗" : "・";
          const state = task.accepted ? "accepted" : task.count > 0 ? "tried" : "none";
          const verdict = task.accepted ? "AC" : task.last ? `${task.last}（${task.count} 回）` : "未提出";
          return (
            <li key={task.task}>
              <button
                type="button"
                className={`contest-task contest-task-${state} ${task.task === currentTask ? "current" : ""}`}
                title={`${task.label ? `${task.label} - ` : ""}${task.title}`}
                onClick={() => onSelectTask({ contest, task: task.task })}
              >
                <span className="contest-mark" aria-hidden="true">
                  {mark}
                </span>
                <span className="contest-label">{task.label}</span>
                <span className="contest-name">{task.title}</span>
                <span className="contest-verdict">{verdict}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        className="contest-link"
        onClick={() => void openSubmissionPage(contest, null).catch(() => {})}
      >
        自分の提出を開く
      </button>
    </div>
  );
}

export default ContestView;
