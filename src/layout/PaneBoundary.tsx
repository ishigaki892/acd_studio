// ペインの描画の失敗を、そのペインの中だけに留める（Phase 10 作業 4。D-167）。
// React は描画の途中で例外が出ると画面全体を外すので、未保存のタブ（App が持つ）や、閉じる前の保存の受け手も
// 消えてしまう。ペインごとに囲み、落ちたペインには理由と「表示し直す」を出し、ほかのペインと App は生かす
import { Component, type ErrorInfo, type ReactNode } from "react";

// onClose があれば「閉じる」も出す（重ねて開く画面〔設定〕のとき）
type Props = { name: string; onClose?: () => void; children: ReactNode };
type State = { error: Error | null };

class PaneBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.name}] 表示できません`, error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="pane-error" role="alert">
          <div>「{this.props.name}」を表示できません：{this.state.error.message}</div>
          <div>ほかの欄と、保存していない変更はそのままです。</div>
          <div className="pane-error-actions">
            <button type="button" className="settings-button" onClick={() => this.setState({ error: null })}>
              表示し直す
            </button>
            {this.props.onClose && (
              <button type="button" className="settings-button" onClick={this.props.onClose}>
                閉じる
              </button>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default PaneBoundary;
