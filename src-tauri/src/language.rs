// 言語（Phase 16。D-204）。実行の対象（toolchain::Target）が持ち、言語ごとに違うことをここで決める。
// Python などを足すときは、ここに種類を足し、match が漏れたところを埋める

use serde::{Deserialize, Serialize};
use std::path::Path;

use crate::cpp::CppSettings;
use crate::python::{Interpreter, PythonSettings};

// 実行・テスト・デバッグに渡す、言語ごとの設定（settings.json の cpp・python の欄。Phase 19 作業 1。D-221）
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct LangSettings {
    pub cpp: CppSettings,
    pub python: PythonSettings,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Language {
    #[default]
    Rust,
    Cpp,
    // Phase 19（D-220）
    Python,
}

impl Language {
    // 画面に出す名前
    pub fn label(self) -> &'static str {
        match self {
            Language::Rust => "Rust",
            Language::Cpp => "C++",
            Language::Python => "Python",
        }
    }

    // パッケージのしるしのファイル（パッケージのディレクトリの直下）
    pub fn marker(self) -> &'static str {
        match self {
            Language::Rust => "Cargo.toml",
            Language::Cpp => "main.cpp",
            Language::Python => "main.py",
        }
    }

    // dir がこの言語のパッケージか（しるしのファイルがあるか）
    pub fn is_package(self, dir: &Path) -> bool {
        dir.join(self.marker()).is_file()
    }

    // 提出のフォームの言語の選択肢のうち、この言語に使うものか（表示の文字で決める。D-148・D-209）。
    // Python は設定の処理系に合わせて選ぶ（Phase 19 作業 4。D-224）。処理系が分からなければ選ばない（送らない）
    pub fn is_submit_option(self, label: &str, python: Option<Interpreter>) -> bool {
        match self {
            Language::Rust => label.starts_with("Rust"),
            Language::Cpp => label == "C++23 (GCC 15.2.0)",
            Language::Python => {
                python.is_some_and(|interpreter| label == interpreter.submit_option())
            }
        }
    }

    // ソースのファイルの拡張子（example の名前の案内に使う。D-212）
    pub fn extension(self) -> &'static str {
        match self {
            Language::Rust => "rs",
            Language::Cpp => "cpp",
            Language::Python => "py",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_and_writes_language_names() {
        assert_eq!(serde_json::to_string(&Language::Cpp).unwrap(), "\"cpp\"");
        assert_eq!(
            serde_json::from_str::<Language>("\"rust\"").unwrap(),
            Language::Rust
        );
        assert_eq!(
            serde_json::from_str::<Language>("\"python\"").unwrap(),
            Language::Python
        );
        assert!(serde_json::from_str::<Language>("\"java\"").is_err());
        assert_eq!(Language::default(), Language::Rust);
    }

    #[test]
    fn chooses_the_submit_option() {
        assert!(Language::Rust.is_submit_option("Rust (rustc 1.89.0)", None));
        assert!(!Language::Rust.is_submit_option("C++23 (GCC 15.2.0)", None));
        assert!(Language::Cpp.is_submit_option("C++23 (GCC 15.2.0)", None));
        assert!(!Language::Cpp.is_submit_option("C++23 (Clang 21.1.0)", None));
        assert!(!Language::Cpp.is_submit_option("C++ IOI-Style(GNU++20) (GCC 14.2.0)", None));
        // Python は処理系の選択肢だけ（Codon・ほかの処理系は選ばない）
        let cpython = Some(Interpreter::Cpython);
        let pypy = Some(Interpreter::Pypy);
        assert!(Language::Python.is_submit_option("Python (CPython 3.13.7)", cpython));
        assert!(!Language::Python.is_submit_option("Python (PyPy 3.11-v7.3.20)", cpython));
        assert!(Language::Python.is_submit_option("Python (PyPy 3.11-v7.3.20)", pypy));
        assert!(!Language::Python.is_submit_option("Python (Codon 0.19.3)", pypy));
        assert!(!Language::Python.is_submit_option("Python (CPython 3.13.7)", None));
    }

    #[test]
    fn names_source_extensions() {
        assert_eq!(Language::Rust.extension(), "rs");
        assert_eq!(Language::Python.extension(), "py");
        assert_eq!(Language::Cpp.extension(), "cpp");
    }
}
