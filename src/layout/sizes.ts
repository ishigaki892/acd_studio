// ペインの大きさの初期値と下限（px）。初期値は 01 §13.3 の推定値（D-019）。
// 下限は作業 2 で決めた仮の値を、作業 7a でそのまま使うと決めた（D-081）。
// ウィンドウの最小サイズ（800 × 500。src-tauri/tauri.conf.json）は、下限の合計を満たす大きさにしている（D-049）
export const ACTIVITYBAR_WIDTH = 52;

export const SIDEBAR_WIDTH = 275;
export const SIDEBAR_MIN = 160;

export const RIGHT_COLUMN_WIDTH = 440;
export const RIGHT_COLUMN_MIN = 240;

// エディタの列の最小幅。ほかの列を広げても、これより狭くしない（D-017）
export const CENTER_MIN = 320;

// 上下に分けたペインの高さの下限
export const PANEL_MIN_HEIGHT = 80;

// 下部パネル・右下パネルの高さの初期値（列の高さに対する割合）
export const BOTTOM_PANEL_RATIO = 0.3; // 中央列 7:3
export const BOTTOM_RIGHT_PANEL_RATIO = 3 / 8; // 右列 5:3

// 下限の半分より小さくドラッグしたら折りたたむ
export function shouldCollapse(size: number, min: number) {
  return size < min / 2;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

// 境界線（2 本、1px ずつ）
const SPLITTERS_WIDTH = 2;

// ウィンドウの幅に合わせて、表示するファイル一覧・右列の幅を決める（D-017）。
// エディタの列が下限より細くなりそうなときは、先に右列を、次にファイル一覧を、それぞれ下限まで細くする。
// ドラッグで決めた幅（引数）は変えないので、ウィンドウを広げると元の幅に戻る
export function fitColumns(
  windowWidth: number,
  sidebar: { width: number; visible: boolean },
  right: { width: number; visible: boolean },
): { sidebarWidth: number; rightWidth: number } {
  let sidebarWidth = sidebar.visible ? sidebar.width : 0;
  let rightWidth = right.visible ? right.width : 0;
  let over =
    ACTIVITYBAR_WIDTH + SPLITTERS_WIDTH + sidebarWidth + rightWidth + CENTER_MIN - windowWidth;
  if (over > 0 && right.visible) {
    const cut = Math.min(over, Math.max(0, rightWidth - RIGHT_COLUMN_MIN));
    rightWidth -= cut;
    over -= cut;
  }
  if (over > 0 && sidebar.visible) {
    const cut = Math.min(over, Math.max(0, sidebarWidth - SIDEBAR_MIN));
    sidebarWidth -= cut;
  }
  return { sidebarWidth, rightWidth };
}
