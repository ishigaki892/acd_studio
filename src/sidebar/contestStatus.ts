// サイドバーの「コンテスト」の、IDE から出した提出の重ね方（Phase 18 作業 4。D-218）
import type { SubmissionView, TaskStatus } from "../ipc/submit";

// IDE から出した提出を、読んだ状況に重ねる（通信しない）。読んだものより新しい提出は回数に足す
export function overlaySubmissions(tasks: TaskStatus[], contest: string, submissions: SubmissionView[]): TaskStatus[] {
  const mine = submissions
    .filter((s) => s.contest === contest && s.submissionId !== null && s.state !== "rejected")
    .sort((a, b) => (a.submissionId ?? 0) - (b.submissionId ?? 0));
  return tasks.map((task) => {
    let next = task;
    for (const submission of mine) {
      if (submission.task !== task.task || submission.submissionId === null) {
        continue;
      }
      const id = submission.submissionId;
      const label = submission.judge?.label || "WJ";
      const accepted = submission.state === "done" && label === "AC";
      if (next.lastId === null || id > next.lastId) {
        next = { ...next, last: label, lastId: id, count: next.count + 1, accepted: next.accepted || accepted };
      } else if (id === next.lastId) {
        next = { ...next, last: label, accepted: next.accepted || accepted };
      }
    }
    return next;
  });
}
