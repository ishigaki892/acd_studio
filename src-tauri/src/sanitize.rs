// 問題文の HTML の無害化（Phase 3a 作業 2。D-118）
//
// 許可リスト方式：決まった要素だけを残し、属性はすべて捨てる（リンク・スタイル・イベントも残さない）。
// script などの危ない要素は中身ごと捨て、それ以外の知らない要素（span・a など）は、
// 要素を外して中の文字だけを残す。画像（img）は、決まった文（IMAGE_NOTE）に置き換える。文字は HTML として読めないように置き換える。
// 出力は IDE がこの規則で組み立て直したものなので、元の HTML の書き方の違いに左右されにくい（推測）

use dom_query::{Document, NodeRef};

// 残す要素（属性は付けない）
const ALLOWED: &[&str] = &[
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "pre",
    "var",
    "code",
    "ul",
    "ol",
    "li",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "strong",
    "em",
    "b",
    "i",
    "sup",
    "sub",
    "section",
    "div",
    "blockquote",
];

// 中身を持たない要素
const VOID: &[&str] = &["br", "hr"];

// 中身ごと捨てる要素
const DROPPED: &[&str] = &[
    "script", "style", "iframe", "frame", "frameset", "object", "embed", "noscript", "template",
    "svg", "math", "form", "input", "button", "select", "textarea", "link", "meta", "title",
    "head", "base", "audio", "video", "canvas",
];

// 画像の代わりに出す文（Phase 7b 作業 2）。画像は読み込まない（CSP の img-src も 'self' だけ）ので、あったことだけを知らせる
pub const IMAGE_NOTE: &str = "［画像があります。公式ページで見てください］";

// 入れ子の深さの上限（それより深いところは捨てる）
const MAX_DEPTH: usize = 128;

fn escape(text: &str, out: &mut String) {
    for c in text.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\'' => out.push_str("&#39;"),
            _ => out.push(c),
        }
    }
}

fn walk(node: &NodeRef, depth: usize, out: &mut String) {
    if depth > MAX_DEPTH {
        return;
    }
    for child in node.children() {
        if child.is_text() {
            escape(child.text().as_ref(), out);
        } else if child.is_element() {
            let name = child
                .node_name()
                .map(|name| name.to_ascii_lowercase())
                .unwrap_or_default();
            if DROPPED.contains(&name.as_str()) {
                continue;
            }
            if name == "img" {
                escape(IMAGE_NOTE, out);
                continue;
            }
            if VOID.contains(&name.as_str()) {
                out.push('<');
                out.push_str(&name);
                out.push('>');
            } else if ALLOWED.contains(&name.as_str()) {
                out.push('<');
                out.push_str(&name);
                out.push('>');
                walk(&child, depth + 1, out);
                out.push_str("</");
                out.push_str(&name);
                out.push('>');
            } else {
                // 知らない要素は外して、中だけを残す
                walk(&child, depth + 1, out);
            }
        }
        // コメントなどは捨てる
    }
}

// HTML の断片を無害化する
pub fn sanitize(fragment: &str) -> String {
    let document = Document::fragment(fragment);
    let mut out = String::new();
    walk(&document.root(), 0, &mut out);
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_allowed_elements_without_attributes() {
        let html = r#"<div class="part"><section><h3>問題文</h3><p style="color:red" onclick="x()"><var>N</var> 個</p><pre id="pre-sample0">1 2
3</pre></section></div>"#;
        assert_eq!(
            sanitize(html),
            "<div><section><h3>問題文</h3><p><var>N</var> 個</p><pre>1 2\n3</pre></section></div>"
        );
    }

    #[test]
    fn drops_dangerous_elements_with_content() {
        let html = r#"<p>a<script>alert(1)</script>b<style>p{}</style>c<iframe src="x"></iframe><svg><script>1</script></svg></p>"#;
        assert_eq!(sanitize(html), "<p>abc</p>");
    }

    #[test]
    fn unwraps_unknown_elements_and_drops_links_and_images() {
        let html = r#"<p><a href="javascript:alert(1)">リンク</a><img src="x" onerror="alert(1)"><span class="lang-ja">日本語</span></p>"#;
        // 画像は読み込まず、あったことを文で知らせる（Phase 7b 作業 2）
        assert_eq!(sanitize(html), format!("<p>リンク{IMAGE_NOTE}日本語</p>"));
    }

    #[test]
    fn escapes_text() {
        // 文字として書かれた「<」などは、要素にならない
        let html = "<p>1 &lt; N &amp;&amp; &lt;script&gt;</p>";
        assert_eq!(sanitize(html), "<p>1 &lt; N &amp;&amp; &lt;script&gt;</p>");
    }

    #[test]
    fn drops_comments_and_keeps_void_elements() {
        assert_eq!(
            sanitize("<p>a<!-- x -->b<br>c</p><hr>"),
            "<p>ab<br>c</p><hr>"
        );
    }

    // Phase 7b 作業 1（AC7b-03）：外を読みに行く・動く・形を変える要素は、中身ごと捨てるか、外して文字だけにする
    #[test]
    fn drops_other_active_elements() {
        let html = r#"<p>a<object data="x"><param name="m" value="y">o</object>b<embed src="x">c<form action="https://example.com">フォーム<input name="q"><button>送る</button></form>d<base href="https://example.com/"><meta http-equiv="refresh" content="0;url=https://example.com"><link rel="stylesheet" href="https://example.com/x.css">e<math><mi>x</mi></math>f<textarea>&lt;img src=x onerror=alert(1)&gt;</textarea>g</p>"#;
        // HTML の読み方の決まりで、p の中の form は p を閉じる（残る文字と要素は危なくない）
        assert_eq!(sanitize(html), "<p>abc</p>defg<p></p>");
    }

    #[test]
    fn does_not_rebuild_markup_from_text() {
        // noscript・title・template の中身を、作り直すときに要素として読み直さない（中身ごと捨てる。文字は置き換える）
        let html = r#"<noscript><p title="</noscript><img src=x onerror=alert(1)>"></p></noscript><p>&lt;img src=x onerror=alert(1)&gt;</p><title><img src=x onerror=alert(2)></title><div><template>x<img src=x onerror=alert(3)></template></div>"#;
        let out = sanitize(html);
        assert!(!out.contains("<img"), "{out}");
        assert!(!out.contains("onerror=alert(1)>"), "{out}");
        assert!(
            out.contains("<p>&lt;img src=x onerror=alert(1)&gt;</p>"),
            "{out}"
        );
        // noscript・template は中身ごと捨てる（文字としても残さない）
        assert!(!out.contains("title="), "{out}");
        assert!(!out.contains("alert(3)"), "{out}");
    }

    #[test]
    fn stops_at_deep_nesting() {
        let html = "<div>".repeat(1000) + "x" + &"</div>".repeat(1000);
        let out = sanitize(&html);
        assert!(!out.contains('x'));
    }
}
