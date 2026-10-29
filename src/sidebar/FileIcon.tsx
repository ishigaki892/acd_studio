// ファイル一覧のアイコン（Phase 8 作業 3。D-156）。自分で描いた 16 × 16 の SVG（ユーザーの選択）。
// 色は種類ごとの CSS 変数（tokens.css の --icon-*）で、App.css の .file-icon-<種類> が付ける

export type IconKind =
  | "folder"
  | "folderOpen"
  | "rust"
  | "cpp"
  | "python"
  | "header"
  | "cargo"
  | "config"
  | "lock"
  | "doc"
  | "json"
  | "input"
  | "output"
  | "text"
  | "file";

// 名前から種類を決める（docs/phase8/03-tree-plan.md §3.2 の表）
export function iconKind(name: string, isDir: boolean, open: boolean): IconKind {
  if (isDir) {
    return open ? "folderOpen" : "folder";
  }
  const lower = name.toLowerCase();
  if (lower === "cargo.toml") {
    return "cargo";
  }
  if (lower === "input.txt") {
    return "input";
  }
  const extension = lower.includes(".") ? lower.slice(lower.lastIndexOf(".") + 1) : "";
  switch (extension) {
    case "rs":
      return "rust";
    case "cpp":
    case "cc":
    case "cxx":
      return "cpp";
    case "py":
      return "python";
    case "h":
    case "hpp":
    case "hh":
      return "header";
    case "toml":
      return "config";
    case "lock":
      return "lock";
    case "md":
      return "doc";
    case "json":
      return "json";
    case "in":
      return "input";
    case "out":
      return "output";
    case "txt":
      return "text";
    default:
      return "file";
  }
}

// 紙の形（右上を折った長方形）
const PAGE = "M3.5 1.5h6l3 3v10h-9z";
const FOLD = "M9.5 1.5v3h3";

function Shape({ kind }: { kind: IconKind }) {
  switch (kind) {
    case "folder":
      return <path d="M1.5 3.5h4.5l1.5 1.5h7v8.5h-13z" fill="currentColor" fillOpacity="0.85" />;
    case "folderOpen":
      return (
        <>
          <path d="M1.5 3.5h4.5l1.5 1.5h7v2h-11l-2 6.5z" fill="currentColor" fillOpacity="0.6" />
          <path d="M3.5 7h11.5l-2.5 6.5h-11z" fill="currentColor" fillOpacity="0.9" />
        </>
      );
    case "rust":
      // 歯車（破線の輪）と中の丸
      return (
        <>
          <circle cx="8" cy="8" r="5.2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeDasharray="1.7 1.1" />
          <circle cx="8" cy="8" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </>
      );
    case "cpp":
      // C と +（C++。Phase 16 作業 1。D-207）
      return (
        <>
          <path d="M9.5 4.3a4.2 4.2 0 1 0 0 7.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12.5 6v4M10.5 8h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </>
      );
    case "python":
      // 2 つの角の丸い四角と目（Python。Phase 19 作業 1。D-222）
      return (
        <>
          <rect x="1.8" y="1.8" width="8.4" height="7" rx="2.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <rect x="5.8" y="7.2" width="8.4" height="7" rx="2.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="4.6" cy="4.4" r="0.9" fill="currentColor" />
          <circle cx="11.4" cy="11.6" r="0.9" fill="currentColor" />
        </>
      );
    case "header":
      // 紙に h（ヘッダー）
      return (
        <>
          <path d={PAGE} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M6 6.5v6.5M6 10c0-1 .8-1.5 1.8-1.5S9.5 9 9.5 10v3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </>
      );
    case "cargo":
      // 箱
      return (
        <>
          <path d="M2 5l6-3 6 3v6.5l-6 3-6-3z" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M2 5l6 3 6-3M8 8v6.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        </>
      );
    case "config":
      // つまみの付いた 3 本の線
      return (
        <>
          <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="5" cy="4" r="1.7" fill="currentColor" />
          <circle cx="11" cy="8" r="1.7" fill="currentColor" />
          <circle cx="7" cy="12" r="1.7" fill="currentColor" />
        </>
      );
    case "lock":
      return (
        <>
          <path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <rect x="3.5" y="7" width="9" height="7" rx="1.2" fill="currentColor" />
        </>
      );
    case "doc":
      return (
        <>
          <path d={PAGE} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          <path d={FOLD} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M5.5 8h5M5.5 10.5h5M5.5 13h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </>
      );
    case "json":
      // 波かっこ
      return (
        <path
          d="M6 2.5c-1.5 0-2 .7-2 2v1.5c0 1-.6 1.6-1.5 2 .9.4 1.5 1 1.5 2v1.5c0 1.3.5 2 2 2M10 2.5c1.5 0 2 .7 2 2v1.5c0 1 .6 1.6 1.5 2-.9.4-1.5 1-1.5 2v1.5c0 1.3-.5 2-2 2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      );
    case "input":
      // 紙に入る矢印
      return (
        <>
          <path d={PAGE} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M1 9.5h6.5M5.5 7.5l2 2-2 2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    case "output":
      // 紙から出る矢印
      return (
        <>
          <path d={PAGE} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M8 9.5h7M13 7.5l2 2-2 2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    case "text":
      return (
        <>
          <path d={PAGE} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          <path d={FOLD} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M5.5 9h5M5.5 11.5h5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </>
      );
    case "file":
      return (
        <>
          <path d={PAGE} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          <path d={FOLD} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        </>
      );
  }
}

function FileIcon({ name, isDir, open }: { name: string; isDir: boolean; open: boolean }) {
  const kind = iconKind(name, isDir, open);
  return (
    <svg className={`file-icon file-icon-${kind}`} width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <Shape kind={kind} />
    </svg>
  );
}

export default FileIcon;
