// rust-analyzer の文書（ホバー・補完の説明・シグネチャ）の HTML の無害化（Phase 3b-1 作業 3。D-125）
//
// 規則は問題文の無害化（src-tauri/src/sanitize.rs。D-118）と同じ許可リスト方式：
// 決まった要素だけを残し、属性はすべて捨てる。script などの危ない要素は中身ごと捨て、
// それ以外の知らない要素（span・a・img など）は、要素を外して中の文字だけを残す。
// このため、文書の中のコードの色分け（span の class）も消える

// 残す要素（属性は付けない）。del は Markdown の取り消し線
const ALLOWED = new Set([
  "h1", "h2", "h3", "h4", "h5", "h6", "p", "pre", "var", "code", "ul", "ol", "li",
  "table", "thead", "tbody", "tr", "th", "td", "strong", "em", "b", "i", "sup", "sub",
  "section", "div", "blockquote", "del",
]);

// 中身を持たない要素
const VOID = new Set(["br", "hr"]);

// 中身ごと捨てる要素
const DROPPED = new Set([
  "script", "style", "iframe", "frame", "frameset", "object", "embed", "noscript", "template",
  "svg", "math", "form", "input", "button", "select", "textarea", "link", "meta", "title",
  "head", "base", "audio", "video", "canvas",
]);

// 入れ子の深さの上限（それより深いところは捨てる）
const MAX_DEPTH = 128;

function escape(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function walk(node: Node, depth: number): string {
  if (depth > MAX_DEPTH) {
    return "";
  }
  let out = "";
  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      out += escape(child.textContent ?? "");
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const name = (child as Element).localName;
      if (DROPPED.has(name)) {
        continue;
      }
      if (VOID.has(name)) {
        out += `<${name}>`;
      } else if (ALLOWED.has(name)) {
        out += `<${name}>${walk(child, depth + 1)}</${name}>`;
      } else {
        // 知らない要素は外して、中だけを残す
        out += walk(child, depth + 1);
      }
    }
    // コメントなどは捨てる
  }
  return out;
}

// HTML の断片を無害化する。DOMParser で作った文書では、script は動かず、画像も読み込まない
export function sanitizeDocHTML(html: string): string {
  const document = new DOMParser().parseFromString(html, "text/html");
  return walk(document.body, 0);
}
