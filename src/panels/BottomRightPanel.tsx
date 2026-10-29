// 右下パネル（原典 §4.8、D-043）：「提出結果」（Phase 6 作業 3。D-148）だけ。
// デバッグ情報は、サイドバーの「実行とデバッグ」に置く（Phase 12 作業 1。D-182）
import type { ReactNode } from "react";

type Props = {
  // 判定を待っている提出がある（見出しに印を出す）
  judging: boolean;
  children: ReactNode;
};

function BottomRightPanel({ judging, children }: Props) {
  return (
    <div className="right-panel">
      <div className="panel-tabs">
        <div className="panel-title">
          提出結果
          {judging ? "（判定中）" : ""}
        </div>
      </div>
      {children}
    </div>
  );
}

export default BottomRightPanel;
