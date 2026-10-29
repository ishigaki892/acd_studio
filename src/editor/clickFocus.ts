import { EditorView } from "@codemirror/view";

// エディタにフォーカスがないときに本文をクリックすると、CodeMirror はフォーカスを本文に戻してから
// 押した位置を読み直す。WebKit はフォーカスを戻すときに前のカーソルの方へスクロールするので、
// 押したときと読み直したときで位置がずれ、前のカーソルの近くまでが選ばれてしまう
// （スクロールバーを押すとフォーカスがスクロールの枠に移るため、そのあとのクリックで起きる。D-190）。
// CodeMirror のクリックの処理より先に（domEventObservers は handlers より先に動く）フォーカスを戻し、
// スクロールの位置を押したときのものに戻す
export const keepScrollOnClickFocus = EditorView.domEventObservers({
  mousedown(event, view) {
    if (view.hasFocus || event.button !== 0) {
      return;
    }
    const scroller = view.scrollDOM;
    const top = scroller.scrollTop;
    const left = scroller.scrollLeft;
    view.contentDOM.focus({ preventScroll: true });
    if (scroller.scrollTop !== top || scroller.scrollLeft !== left) {
      scroller.scrollTop = top;
      scroller.scrollLeft = left;
    }
  },
});
