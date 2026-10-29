import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  createContestPackages,
  describePackage,
  mainFile,
  stopScaffold,
  type ContestCreated,
  type PackageResult,
} from "../ipc/scaffold";

// 「コンテストを作る」（Phase 7a。D-151、docs/phase7/01-pre-start.md §3.3）。ファイル一覧の上の段に出す。
// コンテスト ID を入れて「作る」を押すと、問題の一覧を読み、問題ごとのパッケージを作業領域の直下に作る

type Phase =
  | { kind: "idle" }
  // total は一覧を読むまで null。current は今取っている問題
  | {
      kind: "running";
      contest: string;
      total: number | null;
      current: { index: number; task: string } | null;
      results: PackageResult[];
      stopping: boolean;
    }
  | { kind: "done"; created: ContestCreated }
  | { kind: "error"; message: string };

type Props = {
  // 閉じている（作っている途中でも、閉じて続けられる）
  hidden: boolean;
  // 入力欄の初めの値（今の問題のコンテスト）
  initialContest: string;
  // 作り終えた（止めたときも）。first は、作れた最初の問題の src/main.rs（なければ null）
  onCreated: (first: string | null) => void;
  onClose: () => void;
};

function Results({ results }: { results: PackageResult[] }) {
  return (
    <ul className="contest-creator-results">
      {results.map((result) => (
        <li key={result.task} className={result.error !== null ? "failed" : undefined}>
          <span className="contest-creator-task">{result.task}</span>
          {describePackage(result)}
        </li>
      ))}
    </ul>
  );
}

// 終わったときの 1 行
function summary(created: ContestCreated): string {
  const made = created.packages.filter((result) => result.error === null).length;
  const head = `${created.contest}：${created.total} 問のうち ${made} 問を作りました`;
  return created.stopped ? `${head}（途中で止めました）` : head;
}

function ContestCreator({ hidden, initialContest, onCreated, onClose }: Props) {
  const [contest, setContest] = useState(initialContest);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const running = phase.kind === "running";
  const inputRef = useRef<HTMLInputElement>(null);

  // 開いたら、入力欄に移る
  useEffect(() => {
    if (!hidden) {
      inputRef.current?.focus();
    }
  }, [hidden]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const id = contest.trim();
    if (!id || running) {
      return;
    }
    setPhase({
      kind: "running",
      contest: id,
      total: null,
      current: null,
      results: [],
      stopping: false,
    });
    try {
      const created = await createContestPackages(id, (event) => {
        setPhase((current) => {
          if (current.kind !== "running") {
            return current;
          }
          switch (event.type) {
            case "listed":
              return { ...current, total: event.total };
            case "started":
              return {
                ...current,
                total: event.total,
                current: { index: event.index, task: event.task },
              };
            case "finished":
              return { ...current, current: null, results: [...current.results, event.result] };
          }
        });
      });
      setPhase({ kind: "done", created });
      const first = created.packages.find((result) => result.error === null);
      onCreated(first ? mainFile(first) : null);
    } catch (e) {
      setPhase({ kind: "error", message: String(e) });
    }
  }

  function stop() {
    setPhase((current) => (current.kind === "running" ? { ...current, stopping: true } : current));
    stopScaffold().catch(() => {});
  }

  return (
    <div className="contest-creator" hidden={hidden}>
      <form className="contest-creator-form" onSubmit={(event) => void submit(event)}>
        <input
          ref={inputRef}
          className="contest-creator-input"
          value={contest}
          placeholder="コンテスト ID（例：abc480）"
          aria-label="作るコンテストの ID"
          spellCheck={false}
          disabled={running}
          onChange={(event) => setContest(event.target.value)}
        />

        {running ? (
          <button
            type="button"
            className="run-button contest-creator-button"
            aria-disabled={phase.stopping}
            onClick={stop}
          >
            {phase.stopping ? "止めています…" : "止める"}
          </button>
        ) : (
          <button type="submit" className="run-button contest-creator-button">
            作る
          </button>
        )}
        <button
          type="button"
          className="file-tree-action"
          title="閉じる"
          aria-label="閉じる"
          onClick={onClose}
        >
          ×
        </button>
      </form>
      {phase.kind === "running" && (
        <>
          <div className="contest-creator-status">
            {phase.total === null
              ? `${phase.contest} の問題の一覧を読んでいます…`
              : phase.current
                ? `${phase.current.index + 1} / ${phase.total}：${phase.current.task}`
                : `${phase.results.length} / ${phase.total}`}
          </div>
          <Results results={phase.results} />
        </>
      )}
      {phase.kind === "done" && (
        <>
          <div className="contest-creator-status">{summary(phase.created)}</div>
          {phase.created.configCreated.length > 0 && (
            <div className="contest-creator-note">
              {phase.created.configCreated.join("、")} を作りました（ビルドの置き場所を共有する）
            </div>
          )}
          <Results results={phase.created.packages} />
        </>
      )}
      {phase.kind === "error" && (
        <div className="contest-creator-status failed" role="alert">
          {phase.message}
        </div>
      )}
    </div>
  );
}

export default ContestCreator;
