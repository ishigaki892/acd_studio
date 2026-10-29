import type { PointerEvent } from "react";

type Props = {
  // "vertical"：左右のペインの境界（縦の線）。"horizontal"：上下のペインの境界（横の線）
  orientation: "vertical" | "horizontal";
  // ドラッグ中のポインターの位置（ウィンドウの座標）を受け取る
  onDrag: (clientX: number, clientY: number) => void;
  className?: string;
};

// ペインの境界線。ドラッグでペインの大きさを変える（ライブラリは使わない。D-031）
function Splitter({ orientation, onDrag, className }: Props) {
  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.classList.add(`dragging-${orientation}`);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      onDrag(event.clientX, event.clientY);
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.releasePointerCapture(event.pointerId);
    document.body.classList.remove(`dragging-${orientation}`);
  }

  return (
    <div
      className={`splitter splitter-${orientation} ${className ?? ""}`}
      role="separator"
      aria-orientation={orientation}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}

export default Splitter;
