// 作った C++ の入力のコードを、C++ のファイルの solve()（なければ main()）に書き込む（Phase 17 作業 8。D-213）
//
// - 作ったコードは目印のコメント（BEGIN・END）で囲む。目印があれば、その間を置き換え、なければ関数の先頭に入れる。
//   main() では、先頭の入出力を速くする文（ios::sync_with_stdio・cin.tie）の後に入れる
// - テストケースが複数の問題は、main() にテストケースの数を読むコードを書く。main_loop（設定。D-197）なら、
//   main() の直下の `solve();` を for にする（Rust の input! の置き換えと同じ決まり。input_gen.rs の fill_template）
// - エディタの「solve() の入力を置き換える」と、問題を作るときに入れておく設定（D-198）の両方から使う
//   （画面はこの結果の文で文書を置き換える。docs/phase16/11-cpp-input-plan.md §2.3・§2.4）
// - 文字を読んで、コメント（`//`・`/* */`）・文字列（`"…"`・`R"x(…)x"`）・文字（`'x'`。数の区切りの `1'000` と見分ける）・
//   プリプロセッサの行（`#…`）を飛ばし、名前と `{ } ( ) ;` だけを拾う

use serde::Serialize;

pub const BEGIN: &str = "// 入力（AtCoder Studio）";
pub const END: &str = "// 入力ここまで";
const INDENT: &str = "    ";

// 書き込んだ結果
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Filled {
    pub text: String,
    // 何をしたか（画面に出す）
    pub message: String,
}

#[derive(Debug, Clone, PartialEq)]
enum Lexeme {
    Ident(String),
    Punct(char),
}

#[derive(Debug, Clone)]
struct Token {
    lexeme: Lexeme,
    start: usize,
    end: usize,
}

fn is_ident(token: &Token, name: &str) -> bool {
    matches!(&token.lexeme, Lexeme::Ident(ident) if ident == name)
}

fn is_punct(token: &Token, c: char) -> bool {
    token.lexeme == Lexeme::Punct(c)
}

// 行の始まりから i までが空白だけか（プリプロセッサの行の見分け）
fn at_line_start(text: &str, i: usize) -> bool {
    text[..i]
        .rsplit('\n')
        .next()
        .is_some_and(|before| before.trim().is_empty())
}

// 引用の終わり（quote で閉じる。`\` の次の文字は飛ばす）。閉じなければ文の終わり
fn quoted_end(bytes: &[u8], mut i: usize, quote: u8) -> usize {
    while i < bytes.len() {
        match bytes[i] {
            b'\\' => i += 2,
            b if b == quote => return i + 1,
            b'\n' => return i,
            _ => i += 1,
        }
    }
    bytes.len()
}

fn tokens(text: &str) -> Vec<Token> {
    let bytes = text.as_bytes();
    let mut result = Vec::new();
    let mut i = 0;
    while i < bytes.len() {
        let b = bytes[i];
        if text[i..].starts_with("//") {
            i = text[i..].find('\n').map_or(text.len(), |n| i + n);
        } else if text[i..].starts_with("/*") {
            i = text[i + 2..]
                .find("*/")
                .map_or(text.len(), |n| i + 2 + n + 2);
        } else if b == b'#' && at_line_start(text, i) {
            // 行の終わりの `\` で続く行も飛ばす
            while i < bytes.len() {
                match text[i..].find('\n') {
                    Some(n) if text[..i + n].ends_with('\\') => i += n + 1,
                    Some(n) => {
                        i += n;
                        break;
                    }
                    None => i = text.len(),
                }
            }
        } else if b == b'"' {
            i = quoted_end(bytes, i + 1, b'"');
        } else if b == b'\'' {
            // 数の区切り（1'000'000）なら、ただの区切りとして飛ばす
            if i > 0 && bytes[i - 1].is_ascii_alphanumeric() {
                i += 1;
            } else {
                i = quoted_end(bytes, i + 1, b'\'');
            }
        } else if b.is_ascii_alphabetic() || b == b'_' {
            let start = i;
            while i < bytes.len() && (bytes[i].is_ascii_alphanumeric() || bytes[i] == b'_') {
                i += 1;
            }
            let word = &text[start..i];
            // 生の文字列（R"x(…)x"・u8R"(…)"）
            if word.ends_with('R') && bytes.get(i) == Some(&b'"') {
                let open = text[i + 1..].find('(').map(|n| i + 1 + n);
                i = match open {
                    Some(open) => {
                        let closing = format!("){}\"", &text[i + 1..open]);
                        text[open..]
                            .find(&closing)
                            .map_or(text.len(), |n| open + n + closing.len())
                    }
                    None => text.len(),
                };
                continue;
            }
            result.push(Token {
                lexeme: Lexeme::Ident(word.to_string()),
                start,
                end: i,
            });
        } else if b.is_ascii_digit() {
            while i < bytes.len() && (bytes[i].is_ascii_alphanumeric() || bytes[i] == b'.') {
                i += 1;
            }
        } else if matches!(b, b'{' | b'}' | b'(' | b')' | b';') {
            result.push(Token {
                lexeme: Lexeme::Punct(b as char),
                start: i,
                end: i + 1,
            });
            i += 1;
        } else {
            // ほかの記号と、UTF-8 の文字（続きのバイトも含めて 1 文字ずつ）
            i += text[i..].chars().next().map_or(1, char::len_utf8);
        }
    }
    result
}

// open の位置のかっこに対応する閉じかっこの位置
fn matching(tokens: &[Token], open: usize, left: char, right: char) -> Option<usize> {
    let mut depth = 0;
    for (k, token) in tokens.iter().enumerate().skip(open) {
        if is_punct(token, left) {
            depth += 1;
        } else if is_punct(token, right) {
            depth -= 1;
            if depth == 0 {
                return Some(k);
            }
        }
    }
    None
}

// 関数の定義：名前の位置、本体の `{` と `}` の位置。呼び出し（`solve();`）や宣言（`void solve();`）は除く
#[derive(Debug, Clone, Copy)]
struct Function {
    name: usize,
    open: usize,
    close: usize,
}

fn find_fn(tokens: &[Token], name: &str) -> Option<Function> {
    (1..tokens.len()).find_map(|k| {
        if !is_ident(&tokens[k], name)
            || !matches!(tokens[k - 1].lexeme, Lexeme::Ident(_))
            || !tokens.get(k + 1).is_some_and(|t| is_punct(t, '('))
        {
            return None;
        }
        let params_end = matching(tokens, k + 1, '(', ')')?;
        // `)` のあとの const・noexcept・-> int などの名前を飛ばす
        let mut open = params_end + 1;
        while tokens
            .get(open)
            .is_some_and(|t| matches!(t.lexeme, Lexeme::Ident(_)))
        {
            open += 1;
        }
        if !tokens.get(open).is_some_and(|t| is_punct(t, '{')) {
            return None;
        }
        let close = matching(tokens, open, '{', '}')?;
        Some(Function {
            name: k,
            open,
            close,
        })
    })
}

// at を含む行の、行頭の空白
fn line_indent(text: &str, at: usize) -> &str {
    let start = text[..at].rfind('\n').map_or(0, |n| n + 1);
    let line = &text[start..];
    let end = line
        .find(|c: char| c != ' ' && c != '\t')
        .unwrap_or(line.len());
    &line[..end]
}

// 本体の直下の文（`;` までの名前と記号）を、先頭から順に返す。文は (最初の名前の位置, `;` の位置)
fn statements(tokens: &[Token], function: Function) -> Vec<(usize, usize)> {
    let mut result = Vec::new();
    let mut k = function.open + 1;
    while k < function.close {
        let start = k;
        let mut depth = 0;
        while k < function.close {
            let token = &tokens[k];
            if is_punct(token, '(') || is_punct(token, '{') {
                depth += 1;
            } else if is_punct(token, ')') || is_punct(token, '}') {
                depth -= 1;
                // ブロックの終わり（if・for の本体など）も文の終わり
                if depth == 0 && is_punct(token, '}') {
                    break;
                }
            } else if depth == 0 && is_punct(token, ';') {
                break;
            }
            k += 1;
        }
        result.push((start, k.min(function.close)));
        k += 1;
    }
    result
}

// 入出力を速くする文（ios::sync_with_stdio(false); cin.tie(nullptr); など）か
fn is_fast_io(text: &str, tokens: &[Token], (start, end): (usize, usize)) -> bool {
    let Some(first) = tokens.get(start) else {
        return false;
    };
    let statement = &text[first.start..tokens[end].end];
    ["ios", "ios_base", "std", "cin", "cout"]
        .iter()
        .any(|name| is_ident(first, name))
        && (statement.contains("sync_with_stdio") || statement.contains(".tie("))
}

// 目印で囲んだコード（行頭の空白は indent）
fn block(lines: &[String], indent: &str) -> String {
    let mut text = BEGIN.to_string();
    for line in lines {
        text.push('\n');
        text.push_str(indent);
        text.push_str(line);
    }
    text.push('\n');
    text.push_str(indent);
    text.push_str(END);
    text
}

// 関数に lines を書く変更（始まり, 終わり, 入れる文字）。目印があれば置き換え（true）、なければ先頭に入れる（false）。
// after_fast_io なら、先頭の入出力を速くする文の後に入れる
fn block_edit(
    text: &str,
    tokens: &[Token],
    function: Function,
    lines: &[String],
    after_fast_io: bool,
) -> ((usize, usize, String), bool) {
    let body_start = tokens[function.open].end;
    let body_end = tokens[function.close].start;
    let body = &text[body_start..body_end];
    if let Some(begin) = body.find(BEGIN)
        && let Some(end) = body[begin..].find(END)
    {
        let begin = body_start + begin;
        let end = begin + end + END.len();
        let indent = line_indent(text, begin).to_string();
        return ((begin, end, block(lines, &indent)), true);
    }
    let mut anchor = body_start;
    let mut next = (function.open + 1 < function.close).then_some(function.open + 1);
    if after_fast_io {
        for statement in statements(tokens, function) {
            if !is_fast_io(text, tokens, statement) {
                break;
            }
            anchor = tokens[statement.1].end;
            next = (statement.1 + 1 < function.close).then_some(statement.1 + 1);
        }
    }
    let function_indent = line_indent(text, tokens[function.name].start);
    // 本体の文の行頭の空白に合わせる（文がない、または `{` と同じ行なら、関数の行の空白 + 4）
    let indent = next
        .filter(|&k| text[tokens[function.open].end..tokens[k].start].contains('\n'))
        .map(|k| line_indent(text, tokens[k].start).to_string())
        .unwrap_or_else(|| format!("{function_indent}{INDENT}"));
    let mut insert = format!("\n{indent}{}", block(lines, &indent));
    // `{}` のように、閉じかっこが同じ行に続くなら、改行して閉じる
    if !text[anchor..body_end].contains('\n') && text[anchor..body_end].trim().is_empty() {
        insert.push('\n');
        insert.push_str(function_indent);
    }
    ((anchor, anchor, insert), false)
}

// テストケースの数の名前（main の行の `long long T;` の T）
fn count_name(main_lines: &[String]) -> String {
    main_lines
        .first()
        .and_then(|line| line.strip_suffix(';'))
        .and_then(|line| line.rsplit(' ').next())
        .filter(|name| !name.is_empty())
        .unwrap_or("T")
        .to_string()
}

// 本体の直下の `solve();`（文の始まりのもの）の (始まり, 終わり)
fn direct_solve_call(tokens: &[Token], function: Function) -> Option<(usize, usize)> {
    statements(tokens, function)
        .into_iter()
        .find(|&(start, end)| {
            end == start + 3
                && is_ident(&tokens[start], "solve")
                && is_punct(&tokens[start + 1], '(')
                && is_punct(&tokens[start + 2], ')')
                && is_punct(&tokens[end], ';')
        })
        .map(|(start, end)| (tokens[start].start, tokens[end].end))
}

// text の solve()（なければ main()）に solve の行を、テストケースが複数なら main() に main の行を書く
pub fn fill(
    text: &str,
    solve: &[String],
    main: Option<&[String]>,
    main_loop: bool,
) -> Result<Filled, String> {
    let tokens = tokens(text);
    let solve_fn = find_fn(&tokens, "solve");
    let main_fn = find_fn(&tokens, "main");
    if main.is_some() && solve_fn.is_none() {
        return Err(
            "テストケースが複数の問題には solve() が要ります。void solve() を作ってから押してください"
                .to_string(),
        );
    }
    let (target, target_name) = match (solve_fn, main_fn) {
        (Some(function), _) => (function, "solve()"),
        (None, Some(function)) => (function, "main()"),
        (None, None) => return Err("solve() も main() も見つかりません".to_string()),
    };
    let mut edits = Vec::new();
    let (edit, replaced) = block_edit(text, &tokens, target, solve, solve_fn.is_none());
    edits.push(edit);
    let mut messages = vec![if replaced {
        format!("{target_name} の入力を置き換えました")
    } else {
        format!("{target_name} の先頭に入力を入れました")
    }];
    if let Some(main_lines) = main {
        let count = count_name(main_lines);
        let loop_text = format!("for (int i = 0; i < {count}; i++) solve();");
        match main_fn {
            None => messages.push("main() が見つからないので、main() は変えていません".to_string()),
            Some(function) => {
                let has_block =
                    text[tokens[function.open].end..tokens[function.close].start].contains(BEGIN);
                if main_loop || has_block {
                    let (edit, replaced) = block_edit(text, &tokens, function, main_lines, true);
                    edits.push(edit);
                    let did = if replaced {
                        format!("main() の {count} を読むコードを置き換えました")
                    } else {
                        format!("main() に {count} を読むコードを入れました")
                    };
                    if !main_loop {
                        messages.push(format!(
                            "{did}。solve() をテストケースの数だけ呼ぶ for がなければ書いてください（{loop_text}）"
                        ));
                    } else if let Some((start, end)) = direct_solve_call(&tokens, function) {
                        edits.push((start, end, loop_text));
                        messages.push(format!("{did}。main() の solve(); を for にしました"));
                    } else {
                        messages.push(format!(
                            "{did}。main() の直下に solve(); がないので、for は書いていません"
                        ));
                    }
                } else {
                    messages.push(format!(
                        "main() に入力がないので、main() は変えていません。main() に {count} を読むコードと {loop_text} を書いてください"
                    ));
                }
            }
        }
    }
    edits.sort_by_key(|edit| std::cmp::Reverse(edit.0));
    let mut result = text.to_string();
    for (start, end, insert) in edits {
        result.replace_range(start..end, &insert);
    }
    Ok(Filled {
        text: result,
        message: messages.join("。"),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn lines(items: &[&str]) -> Vec<String> {
        items.iter().map(|line| line.to_string()).collect()
    }

    const DEFAULT: &str = "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n}\n";

    #[test]
    fn inserts_after_the_fast_io_lines_and_replaces_next_time() {
        let solve = lines(&["long long N;", "cin >> N;"]);
        let first = fill(DEFAULT, &solve, None, false).unwrap();
        assert_eq!(
            first.text,
            "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    // 入力（AtCoder Studio）\n    long long N;\n    cin >> N;\n    // 入力ここまで\n}\n"
        );
        assert_eq!(first.message, "main() の先頭に入力を入れました");
        // 2 回目は目印の間を置き換える（目印の外は変えない）
        let again = lines(&["long long N, M;", "cin >> N >> M;"]);
        let second = fill(&first.text, &again, None, false).unwrap();
        assert_eq!(
            second.text,
            first.text.replace(
                "    long long N;\n    cin >> N;\n",
                "    long long N, M;\n    cin >> N >> M;\n"
            )
        );
        assert_eq!(second.message, "main() の入力を置き換えました");
    }

    #[test]
    fn prefers_solve_and_handles_test_cases() {
        let text = "#include <bits/stdc++.h>\nusing namespace std;\n\nvoid solve() {\n    cout << 1 << endl;\n}\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    solve();\n}\n";
        let solve = lines(&["long long N;", "cin >> N;"]);
        let main = lines(&["long long T;", "cin >> T;"]);
        // 設定の for が入：main() に T を入れ、直下の solve(); を for にする
        let filled = fill(text, &solve, Some(&main), true).unwrap();
        assert_eq!(
            filled.text,
            "#include <bits/stdc++.h>\nusing namespace std;\n\nvoid solve() {\n    // 入力（AtCoder Studio）\n    long long N;\n    cin >> N;\n    // 入力ここまで\n    cout << 1 << endl;\n}\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    // 入力（AtCoder Studio）\n    long long T;\n    cin >> T;\n    // 入力ここまで\n    for (int i = 0; i < T; i++) solve();\n}\n"
        );
        assert_eq!(
            filled.message,
            "solve() の先頭に入力を入れました。main() に T を読むコードを入れました。main() の solve(); を for にしました"
        );
        // もう一度：どちらも置き換え。for はもう直下の solve(); ではないので、二重にしない
        let again = fill(&filled.text, &solve, Some(&main), true).unwrap();
        assert_eq!(again.text, filled.text);
        assert!(
            again.message.contains("for は書いていません"),
            "{}",
            again.message
        );
        // 設定の for が切で、main() に目印がない：main() は変えずに知らせる
        let off = fill(text, &solve, Some(&main), false).unwrap();
        assert!(off.text.contains(
            "int main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    solve();\n}"
        ));
        assert!(
            off.message.contains("main() は変えていません"),
            "{}",
            off.message
        );
        // solve() がないと、テストケースが複数の問題には書かない
        assert!(fill(DEFAULT, &solve, Some(&main), true).is_err());
        assert!(fill("int x;\n", &solve, None, false).is_err());
    }

    #[test]
    fn skips_comments_strings_and_declarations() {
        // コメント・文字列・文字・数の区切り・プリプロセッサの中の { } と、solve の宣言・呼び出しは見ない
        let text = "#define BLOCK { }\n// void solve() {\nvoid solve();\nconst char* s = \"void solve() {\";\nauto r = R\"x(void solve() { )x\";\nchar c = '{';\nlong long big = 1'000'000;\n/* int main() { */\nvoid solve() const {}\nint main() { solve(); }\n";
        let solve = lines(&["long long N;", "cin >> N;"]);
        let filled = fill(text, &solve, None, false).unwrap();
        assert!(
            filled.text.contains(
                "void solve() const {\n    // 入力（AtCoder Studio）\n    long long N;\n    cin >> N;\n    // 入力ここまで\n}\nint main() { solve(); }\n"
            ),
            "{}",
            filled.text
        );
        assert!(
            filled
                .text
                .starts_with("#define BLOCK { }\n// void solve() {\nvoid solve();\n")
        );
    }

    #[test]
    fn keeps_the_indentation_of_the_function() {
        let text = "struct S {\n\tvoid solve() {\n\t\tint x = 0;\n\t}\n};\n";
        let filled = fill(text, &lines(&["long long N;"]), None, false).unwrap();
        assert_eq!(
            filled.text,
            "struct S {\n\tvoid solve() {\n\t\t// 入力（AtCoder Studio）\n\t\tlong long N;\n\t\t// 入力ここまで\n\t\tint x = 0;\n\t}\n};\n"
        );
    }
}
