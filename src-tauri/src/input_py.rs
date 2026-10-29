// 作った Python の入力のコードを、main.py の solve()（なければ main()）に書き込む（Phase 20 作業 7。D-227）
//
// - C++（input_cpp.rs）と同じ決まり：作ったコードは目印のコメント（BEGIN・END）で囲む。目印があれば、その間を置き換え、
//   なければ関数の先頭に入れる。関数の中身が `pass` だけなら、それと置き換える
// - テストケースが複数の問題は、main() にテストケースの数を読むコードを書く。main_loop（設定。D-197）なら、
//   main() の直下の `solve()` を for にする
// - Python の関数は字下げで決まるので、行ごとに読む：`def <名前>(…):` の行から、それより深く字下げした行（と空行）までを
//   中身とする。字下げは中身の最初の行に合わせる（なければ 4 スペース）
// - 1 行で書いた def（`def main(): pass`）と、引数が複数行にわたる def は扱わない（見つからないものとする）

use crate::input_cpp::Filled;

pub const BEGIN: &str = "# 入力（AtCoder Studio）";
pub const END: &str = "# 入力ここまで";
const INDENT: &str = "    ";

// 行の先頭の字下げ（空白とタブ）
fn indent_of(line: &str) -> &str {
    let trimmed = line.trim_start_matches([' ', '\t']);
    &line[..line.len() - trimmed.len()]
}

fn is_blank(line: &str) -> bool {
    line.trim().is_empty()
}

// 見つけた関数（行の番号は 0 始まり）
#[derive(Debug, Clone, Copy)]
struct Function {
    // def の行
    def: usize,
    // 中身の行（start..end。後ろの空行は含めない）
    start: usize,
    end: usize,
}

impl Function {
    // 中身の字下げ。中身の最初の空でない行に合わせる（なければ def の字下げ + 4 スペース）
    fn body_indent<'a>(&self, lines: &'a [&'a str]) -> String {
        lines[self.start..self.end]
            .iter()
            .find(|line| !is_blank(line))
            .map(|line| indent_of(line).to_string())
            .unwrap_or_else(|| format!("{}{INDENT}", indent_of(lines[self.def])))
    }
}

// `def <name>(` で始まり `:` で終わる行（後ろのコメントは見ない）の関数
fn find_fn(lines: &[&str], name: &str) -> Option<Function> {
    let head = format!("def {name}(");
    let def = lines.iter().position(|line| {
        let code = line.split('#').next().unwrap_or_default().trim_end();
        line.trim_start().starts_with(&head) && code.ends_with(':')
    })?;
    let depth = indent_of(lines[def]).len();
    let mut end = def + 1;
    let mut last = def + 1;
    while end < lines.len() {
        let line = lines[end];
        if !is_blank(line) {
            if indent_of(line).len() <= depth {
                break;
            }
            last = end + 1;
        }
        end += 1;
    }
    Some(Function {
        def,
        start: def + 1,
        end: last,
    })
}

// 書き換え：lines[start..end] を insert（行の並び。改行は付けない）にする
type Edit = (usize, usize, Vec<String>);

// 関数の中身の目印の間を置き換える（なければ先頭に入れる。中身が pass だけなら、それと置き換える）。置き換えたなら true
fn block_edit(lines: &[&str], function: Function, code: &[String]) -> (Edit, bool) {
    let indent = function.body_indent(lines);
    let mut block = vec![format!("{indent}{BEGIN}")];
    block.extend(code.iter().map(|line| format!("{indent}{line}")));
    block.push(format!("{indent}{END}"));
    let body = function.start..function.end;
    let begin = body.clone().find(|&i| lines[i].trim() == BEGIN);
    let end = begin.and_then(|begin| (begin..function.end).find(|&i| lines[i].trim() == END));
    if let (Some(begin), Some(end)) = (begin, end) {
        return ((begin, end + 1, block), true);
    }
    let statements: Vec<usize> = body.filter(|&i| !is_blank(lines[i])).collect();
    if let [only] = statements[..]
        && lines[only].trim() == "pass"
    {
        return ((only, only + 1, block), false);
    }
    ((function.start, function.start, block), false)
}

// main() の直下（中身の字下げ）の `solve()` の行
fn direct_solve_call(lines: &[&str], function: Function) -> Option<usize> {
    let indent = function.body_indent(lines);
    (function.start..function.end)
        .find(|&i| indent_of(lines[i]) == indent && lines[i].trim() == "solve()")
}

// テストケースの数の名前（`T = int(input())` の T）
fn count_name(main: &[String]) -> String {
    main.first()
        .and_then(|line| line.split_once(" = "))
        .map(|(name, _)| name.trim().to_string())
        .unwrap_or_else(|| "T".to_string())
}

// text の solve()（なければ main()）に solve の行を、テストケースが複数なら main() に main の行を書く
pub fn fill(
    text: &str,
    solve: &[String],
    main: Option<&[String]>,
    main_loop: bool,
) -> Result<Filled, String> {
    let lines: Vec<&str> = text.lines().collect();
    let solve_fn = find_fn(&lines, "solve");
    let main_fn = find_fn(&lines, "main");
    if main.is_some() && solve_fn.is_none() {
        return Err(
            "テストケースが複数の問題には solve() が要ります。def solve(): を作ってから押してください"
                .to_string(),
        );
    }
    let (target, target_name) = match (solve_fn, main_fn) {
        (Some(function), _) => (function, "solve()"),
        (None, Some(function)) => (function, "main()"),
        (None, None) => return Err("solve() も main() も見つかりません".to_string()),
    };
    let mut edits = Vec::new();
    let (edit, replaced) = block_edit(&lines, target, solve);
    edits.push(edit);
    let mut messages = vec![if replaced {
        format!("{target_name} の入力を置き換えました")
    } else {
        format!("{target_name} の先頭に入力を入れました")
    }];
    if let Some(main_lines) = main {
        let count = count_name(main_lines);
        let loop_text = format!("for _ in range({count}): solve()");
        match main_fn {
            None => messages.push("main() が見つからないので、main() は変えていません".to_string()),
            Some(function) => {
                let has_block = (function.start..function.end).any(|i| lines[i].trim() == BEGIN);
                if main_loop || has_block {
                    let (edit, replaced) = block_edit(&lines, function, main_lines);
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
                    } else if let Some(call) = direct_solve_call(&lines, function) {
                        let indent = function.body_indent(&lines);
                        let unit = indent
                            .strip_prefix(indent_of(lines[function.def]))
                            .filter(|unit| !unit.is_empty())
                            .unwrap_or(INDENT);
                        edits.push((
                            call,
                            call + 1,
                            vec![
                                format!("{indent}for _ in range({count}):"),
                                format!("{indent}{unit}solve()"),
                            ],
                        ));
                        messages.push(format!("{did}。main() の solve() を for にしました"));
                    } else {
                        messages.push(format!(
                            "{did}。main() の直下に solve() がないので、for は書いていません"
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
    // 後ろの書き換えから当てる（前の行の番号が変わらないように）。同じ行から始まるもの（main() の先頭に入れるものと、
    // 先頭の solve() の行を for にするもの）は、行を置き換える方を先に当て、入れる方をその前に足す
    edits.sort_by_key(|edit| std::cmp::Reverse((edit.0, edit.1)));
    let mut result: Vec<String> = lines.iter().map(|line| line.to_string()).collect();
    for (start, end, insert) in edits {
        result.splice(start..end, insert);
    }
    let mut text_out = result.join("\n");
    if text.ends_with('\n') || text.is_empty() {
        text_out.push('\n');
    }
    Ok(Filled {
        text: text_out,
        message: messages.join("。"),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn lines(items: &[&str]) -> Vec<String> {
        items.iter().map(|line| line.to_string()).collect()
    }

    // IDE の最小の雛形（scaffold.rs の DEFAULT_MAIN_PY と同じ）
    const DEFAULT: &str = "def main():\n    pass\n\n\nmain()\n";

    #[test]
    fn replaces_pass_and_then_the_block() {
        let solve = lines(&["N = int(input())", "A = list(map(int, input().split()))"]);
        let filled = fill(DEFAULT, &solve, None, false).unwrap();
        assert_eq!(
            filled.text,
            "def main():\n    # 入力（AtCoder Studio）\n    N = int(input())\n    A = list(map(int, input().split()))\n    # 入力ここまで\n\n\nmain()\n"
        );
        assert_eq!(filled.message, "main() の先頭に入力を入れました");
        // 2 度目は目印の間を置き換える。ほかの行はそのまま
        let edited = filled
            .text
            .replace("\n\n\nmain()", "\n    print(N)\n\n\nmain()");
        let again = fill(
            &edited,
            &lines(&["N, M = map(int, input().split())"]),
            None,
            false,
        )
        .unwrap();
        assert_eq!(
            again.text,
            "def main():\n    # 入力（AtCoder Studio）\n    N, M = map(int, input().split())\n    # 入力ここまで\n    print(N)\n\n\nmain()\n"
        );
        assert_eq!(again.message, "main() の入力を置き換えました");
    }

    #[test]
    fn writes_into_solve_and_loops_in_main() {
        let text = "import sys\n\n\ndef solve():\n    ans = 0\n    print(ans)\n\n\ndef main():\n    solve()\n\n\nmain()\n";
        let solve = lines(&["N = int(input())"]);
        let main = lines(&["T = int(input())"]);
        let filled = fill(text, &solve, Some(&main), true).unwrap();
        assert_eq!(
            filled.text,
            "import sys\n\n\ndef solve():\n    # 入力（AtCoder Studio）\n    N = int(input())\n    # 入力ここまで\n    ans = 0\n    print(ans)\n\n\ndef main():\n    # 入力（AtCoder Studio）\n    T = int(input())\n    # 入力ここまで\n    for _ in range(T):\n        solve()\n\n\nmain()\n"
        );
        assert_eq!(
            filled.message,
            "solve() の先頭に入力を入れました。main() に T を読むコードを入れました。main() の solve() を for にしました"
        );
        // もう一度押しても、for の中の solve() は変えない
        let again = fill(&filled.text, &solve, Some(&main), true).unwrap();
        assert_eq!(again.text, filled.text);
        assert!(
            again.message.contains("main() の直下に solve() がないので"),
            "{}",
            again.message
        );
        // 設定が切なら、main() に入力がなければ変えない
        let off = fill(text, &solve, Some(&main), false).unwrap();
        assert!(off.text.contains("def main():\n    solve()\n"));
        assert!(
            off.message
                .contains("for _ in range(T): solve() を書いてください"),
            "{}",
            off.message
        );
    }

    #[test]
    fn keeps_tabs_and_refuses_without_functions() {
        let text = "def main():\n\tx = 1\n\nmain()";
        let filled = fill(text, &lines(&["N = int(input())"]), None, false).unwrap();
        assert_eq!(
            filled.text,
            "def main():\n\t# 入力（AtCoder Studio）\n\tN = int(input())\n\t# 入力ここまで\n\tx = 1\n\nmain()"
        );
        assert_eq!(
            fill("print(1)\n", &[], None, false).unwrap_err(),
            "solve() も main() も見つかりません"
        );
        assert!(
            fill(DEFAULT, &[], Some(&lines(&["T = int(input())"])), true)
                .unwrap_err()
                .contains("solve() が要ります")
        );
        // 1 行の def は扱わない
        assert!(fill("def main(): pass\n", &[], None, false).is_err());
    }
}
