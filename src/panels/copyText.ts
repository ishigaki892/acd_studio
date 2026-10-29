// 文字列をクリップボードに入れる（実行ログのコピー。Phase 4a 作業 1。D-137）。
// まず navigator.clipboard を使い、使えなければ（権限・WebView の制限）一時的な入力欄を使う方法で試す。
// 入れられたら true
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 次の方法へ
  }
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  const focused = document.activeElement;
  document.body.appendChild(field);
  field.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
    if (focused instanceof HTMLElement) {
      focused.focus();
    }
  }
}
