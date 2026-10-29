# AtCoder Studio

AtCoder の問題を Rust・C++・Python で解くための、macOS 向けデスクトップ IDE です。問題の取得からサンプルテスト、デバッグ、提出までを、ひとつのウィンドウで済ませられます。

## できること

- **問題の準備**：コンテスト ID を入れるだけで、全問題のフォルダ（サンプル・自分の雛形入り）をまとめて作れます。問題文は数式付きでウィンドウ内に表示されます。問題文の入力形式から、入力を読むコード（Rust は proconio の `input!`、C++ は `cin`、Python は `input()`）を自動で作ることもできます。
- **テスト**：サンプルテストの判定（AC・WA・RE・TLE・MLE・OLE・CE）に加えて、生成器と愚直解を使ったランダムテストや、インタラクティブ問題の対話テストもできます。
- **エディタ**：CodeMirror 6 をベースに、rust-analyzer・clangd・basedpyright による補完・診断・定義ジャンプが使えます（整形は Rust と C++ のみ）。言語ごとのスニペットも登録できます。
- **デバッグ**：ブレークポイント、ステップ実行、変数とウォッチ式の表示ができます。Rust と C++ は Apple の `lldb-dap`、Python は debugpy を使います。Rust の panic、C++ の例外や `abort`、Python の捕まえていない例外で止まります。
- **提出**：開催中のコンテストなら IDE から直接提出して、そのまま判定を追えます。ログインは IDE 内の専用ウィンドウで行うので、パスワードが IDE に渡ることはありません。サイドバーの「コンテスト」で、問題ごとの AC 状況も確認できます。

対応している言語と提出時の言語は次のとおりです。

| 言語 | 手元の環境 | 提出時の言語 |
|---|---|---|
| Rust | rustup の Rust | 「Rust」で始まるもの |
| C++ | Homebrew の GCC（`g++-15`） | C++23 (GCC 15.2.0) |
| Python | CPython 3.13 または PyPy 3.11 | Python (CPython 3.13.7) / Python (PyPy 3.11-v7.3.20) |

> [!IMPORTANT]
> AtCoder の非公式ツールです。AtCoder 株式会社とは関係ありません。
>
> - 提出機能は自己責任でお使いください。製作者は責任を負いません
> - コンテストに参加するときは、そのコンテストのルール（生成 AI の利用に関するルールを含む）を守ってください。

## 必要なもの

動作を確認しているのは macOS 26.6.2（Apple Silicon）だけです。使う言語に合わせて、次のものを用意してください。

- **Rust**：[rustup](https://rustup.rs) でインストールした Rust。ジャッジと同じ rustc 1.89.0 を rustup の既定にしておくと、手元とジャッジの差が小さくなります（今の既定は `rustup toolchain list` の `(active, default)` の行で確認できます）。
- **C++**：Homebrew の GCC（`brew install gcc` で入る `g++-15`）。Apple の clang は `#include <bits/stdc++.h>` が使えないので使いません。
  - AC Library を使う場合は、ジャッジと同じ 1.6 を [atcoder/ac-library](https://github.com/atcoder/ac-library) からダウンロードして、アプリのフォルダの `libraries/ac-library/atcoder/` に置きます（詳しくは [C++](docs/usage.md#c)）。
- **Python**：Homebrew の Python（`brew install python@3.13`。PyPy を使うなら `brew install pypy3.11` も）。補完などを使うには basedpyright（`brew install basedpyright`）が必要です。デバッグに使う debugpy は、初めてデバッグするときに IDE がインストール方法を案内します。
- **デバッグと C++ の補完**：Xcode の Command Line Tools（`lldb-dap` と `clangd` が入っています）。入っていなければ、IDE が `xcode-select --install` を案内します。

## インストール

[Releases](https://github.com/ishigaki892/acd_studio/releases) から `.dmg` をダウンロードするのが手軽です。`.dmg` は Apple Silicon 用のみなので、Intel Mac の場合は[ソースからビルド](#ソースからビルドする)してください。

### .dmg からインストールする

1. Releases から `AtCoder.Studio_<バージョン>_aarch64.dmg` をダウンロードして開きます。
2. 表示されたウィンドウで、AtCoder Studio を「Applications」フォルダにドラッグします。
3. Finder の「アプリケーション」から AtCoder Studio を開きます。

このアプリは Developer ID での署名や Apple の公証をしていない（ad-hoc 署名のみ）ため、初回は macOS にブロックされます。そのときは「完了」を押してから、「システム設定」→「プライバシーとセキュリティ」を開き、下のほうにある「このまま開く」を押して、もう一度起動してください。

ターミナルで次のコマンドを実行して、ダウンロード時に付く印を外してから開く方法もあります。

```sh
xattr -dr com.apple.quarantine "/Applications/AtCoder Studio.app"
```

**アップデートするとき**：AtCoder Studio を終了（⌘Q）し、`/Applications/AtCoder Studio.app` を削除してから、新しい `.dmg` で手順 2〜3 を行います。設定・履歴・保存した問題はアプリのフォルダにあるので、そのまま残ります（[データの場所](docs/usage.md#データの場所)）。

### ソースからビルドする

ビルドには Node.js（`.nvmrc` のバージョン）と npm、Rust が必要です。

1. リポジトリの最上位でビルドします（3 分ほどかかります）。

   ```sh
   nvm use
   npm install
   npm run tauri build
   ```

2. 開発用のアプリ（`npm run tauri dev`）を起動している場合は止めておきます（同じ設定を使うので、同時には起動できません）。
3. できたアプリを `/Applications` にコピーします。

   ```sh
   cp -R "src-tauri/target/release/bundle/macos/AtCoder Studio.app" /Applications/
   ```

4. Finder の「アプリケーション」から AtCoder Studio を開きます。

新しいソースでビルドし直したときは、AtCoder Studio を終了して `/Applications/AtCoder Studio.app` を削除してから、手順 3 でコピーし直してください。

## 使ってみる

1. **フォルダを開く**：ファイル一覧の「フォルダを開く」（⌘O）で、問題を置くフォルダを選びます。初めて開くフォルダでは「このフォルダを信頼しますか」と聞かれるので、自分で作ったフォルダなら「信頼する」を選んでください。信頼しないフォルダでは、コードを実行する操作ができません。
2. **コンテストを作る**：ファイル一覧の上にある「⤓」を押し、コンテスト ID（例：`abc480`）を入れて「作る」を押します。`abc480/abc480_a/` のように問題ごとのフォルダができ、A 問題のファイルが開いて、右に問題文が表示されます。
   - C++ や Python で解くときは、先に設定画面（⌘,）の「問題文」で「問題を作るときの言語」を切り替えておきます。開くファイルは、Rust なら `src/main.rs`、C++ なら `main.cpp`、Python なら `main.py` です。
3. **解いてテストする**：解答を書いたら「サンプルテスト」（⇧⌘R）を押します。下の「テスト結果」タブに、ケースごとの判定が表示されます。
4. **提出する**：開催中のコンテストなら、右下の「提出結果」からログインして「提出」を押します。確認ダイアログで「提出する」を選ぶと提出され、判定が出るまで追いかけます。開催期間外の問題では、代わりに「コードをコピーして公式の提出ページを開く」が使えます。

機能ごとの詳しい使い方は [docs/usage.md](docs/usage.md) にまとめています。

## 開発について

- 公開しているリポジトリには、開発用の文書（設計の記録・作業ログ・開発の手順をまとめた CLAUDE.md）は置いていません。`docs/` にあるのは使い方（[docs/usage.md](docs/usage.md)）だけなので、コードのコメントに出てくる `docs/` 内のほかのファイルは見られません。
- 開発用のコマンドは、`npm run tauri dev`（開発用に起動）、`npm run build`（フロントエンドの型チェックとビルド）、`src-tauri/` での `cargo test`・`cargo clippy --all-targets`・`cargo fmt` です。
- Windows には対応していません。
- Claude Codeを使用して開発しています。

## ライセンス

[MIT](LICENSE) です。依存ライブラリはそれぞれのライセンスに従います。配布しているアプリに含まれるライブラリの一覧とライセンス全文は [THIRD_PARTY_LICENSES.txt](THIRD_PARTY_LICENSES.txt) にあります（Releases にも `.dmg` と一緒に置いています）。
