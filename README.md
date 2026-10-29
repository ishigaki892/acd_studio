# AtCoder Studio

AtCoder で Rust・C++・Python を使って解くための、macOS のデスクトップ IDE です。問題の取得から、サンプルテスト・デバッグ・提出までを 1 つの窓で行えます。

- **問題とコンテスト**：コンテストの問題を一式、問題ごとのパッケージとして作ります（Rust は Cargo のパッケージ、C++ は `main.cpp`、Python は `main.py` のフォルダ。サンプル・自分の雛形つき）。問題文は数式つきで窓の中に出ます。問題文の入力の形式から、入力を読むコード（Rust は proconio の `input!`、C++ は宣言と `cin`、Python は行ごとの `input()`）も作れます。
- **実行とテスト**：実行、サンプルテスト（AC・WA・RE・TLE・MLE・OLE・CE）、ランダムテスト（生成器と愚直解）、対話テスト（ジャッジとつなぐ）。
- **Python**：CPython 3.13・PyPy 3.11 で、実行・テスト・問題作り・提出ができます。言語サーバーは basedpyright、デバッグは debugpy です。
- **エディタ**：CodeMirror 6 と、言語サーバーの rust-analyzer・clangd・basedpyright（補完・診断・定義ジャンプ。整形は Rust と C++）。言語ごとのスニペット。
- **デバッグ**：ブレークポイント・ステップ・変数・ウォッチ式（Apple 版 `lldb-dap`。Rust の panic、C++ の例外・`abort` で止まる。Python は debugpy で、捕まえていない例外で止まる）。
- **提出**：開催期間中は IDE から提出し、判定を追います（ログインは IDE の窓で行い、パスワードは IDE に渡りません）。言語は Rust、C++ は「C++23 (GCC 15.2.0)」、Python は設定の処理系に合わせて「Python (CPython 3.13.7)」か「Python (PyPy 3.11-v7.3.20)」です。サイドバーの「コンテスト」で、問題ごとの AC・未AC を見られます。

> [!IMPORTANT]
> AtCoder の非公式のツールです。AtCoder 株式会社とは関係ありません。
>
> - 提出の機能は、自己責任で使ってください。AtCoder は非公式のツールをサポートしていません。AtCoder の提出の仕様が変わると、使えなくなることがあります。
> - コンテストに出るときは、そのコンテストのルール（生成 AI の利用のルールを含む）を守ってください。

## 必要なもの

- **macOS**：動作を確かめたのは macOS 26.6.2（Apple Silicon）だけです。
- **Rust で解くとき**：[rustup](https://rustup.rs) で入れた Rust。ジャッジと同じ版（rustc 1.89.0）を rustup の既定にしておくと、手元とジャッジの違いが小さくなります。今の既定は、ターミナルで `rustup toolchain list` を実行すると `(active, default)` の付いた行で分かります。
- **C++ で解くとき**：Homebrew の GCC（ターミナルで `brew install gcc` を実行すると入る `g++-15`。ジャッジと同じ GCC 15.2.0 だと、手元とジャッジの違いが小さくなります）。Apple の clang では `#include <bits/stdc++.h>` が使えないため使いません。
  - AC Library を使うときは、ジャッジと同じ 1.6 を [atcoder/ac-library](https://github.com/atcoder/ac-library) から取り、アプリのフォルダの `libraries/ac-library/atcoder/` に置きます（[C++](docs/usage.md#c)）。
- **Python で解くとき**：Homebrew の Python（`brew install python@3.13`。PyPy を使うなら `brew install pypy3.11`）。言語機能には basedpyright（`brew install basedpyright`）。デバッグには debugpy（初めてデバッグするときに、入れる命令を IDE が案内します）。
- **デバッグと C++ の言語機能を使うとき**：Xcode の Command Line Tools（`lldb-dap` と `clangd` が入っています）。入っていなければ、IDE が `xcode-select --install` を案内します。
- **自分でビルドするとき**：Node.js（`.nvmrc` の版。nvm を使うなら `nvm use`）と npm。

## 入れ方

[Releases](https://github.com/ishigaki892/acd_studio/releases) の `.dmg`（Apple Silicon 用）から入れるか、自分でビルドします。Intel の Mac 用の `.dmg` は用意していません。

### Releases の .dmg から入れる

1. Releases から `AtCoder Studio_<版>_aarch64.dmg` を取り、開きます。
2. 出てきた窓で、AtCoder Studio を「Applications」に引いて写します。
3. Finder の「アプリケーション」から AtCoder Studio を開きます。署名は ad-hoc だけ（Developer ID の署名・Apple の公証はしていません）なので、初めて開くときは macOS が止めます。止められたら「完了」を押し、システム設定の「プライバシーとセキュリティ」の下のほうにある「このまま開く」を押してから、もう一度開きます。
   - ターミナルで `xattr -dr com.apple.quarantine "/Applications/AtCoder Studio.app"` を実行してから開いても構いません（ダウンロードしたものに付く印を外します）。

依存しているライブラリのライセンスは、Releases に `.dmg` と並べて置いた `THIRD_PARTY_LICENSES.txt`（リポジトリの最上位にもあります）にあります。

**新しい版にするとき**：AtCoder Studio を終えて（⌘Q）、`/Applications/AtCoder Studio.app` を消してから、新しい `.dmg` で 2〜3 を行います。設定・履歴・保存した問題は、アプリのフォルダにあるので残ります（[データの場所](docs/usage.md#データの場所)）。

### 自分でビルドする

1. リポジトリの最上位で、依存を取ってビルドします（3 分ほどかかります）。

   ```sh
   nvm use
   npm install
   npm run tauri build
   ```

2. 開発用のアプリ（`npm run tauri dev`）が動いていれば止めます（同じ設定を使うので、同時には起動できません）。
3. できたアプリを `/Applications` に写します。

   ```sh
   cp -R "src-tauri/target/release/bundle/macos/AtCoder Studio.app" /Applications/
   ```

4. Finder の「アプリケーション」から AtCoder Studio を開きます。

**入れ替える（新しいビルドにする）とき**：AtCoder Studio を終えて（⌘Q）、1 でビルドし直し、`/Applications/AtCoder Studio.app` を消してから 3 で写し直します。設定・履歴・保存した問題は、アプリのフォルダにあるので残ります（[データの場所](docs/usage.md#データの場所)）。

## はじめの一歩

1. **フォルダを開く**：ファイル一覧の「フォルダを開く」（または ⌘O）で、問題を置くフォルダを選びます。初めてのフォルダでは「このフォルダを信頼しますか」と聞かれます。自分で作ったフォルダなら「信頼する」を選びます（信頼しないフォルダでは、コードを動かす操作ができません）。
2. **コンテストを作る**：ファイル一覧の見出しの「⤓」を押し、コンテスト ID（例：`abc480`）を入れて「作る」を押します。`abc480/abc480_a/` などのパッケージができ、A 問題の `src/main.rs`（C++ なら `main.cpp`）が開き、右に問題文が出ます。C++・Python で解くときは、先に設定の画面（⌘,）の「問題文」で「問題を作るときの言語」を C++・Python にします（Python なら `main.py` が開きます）。
3. **解いてサンプルテスト**：`src/main.rs`（C++ なら `main.cpp`）に解答を書き、「サンプルテスト」（⇧⌘R）を押します。下の「テスト結果」のタブに、ケースごとの判定が出ます。
4. **提出**：開催期間中の問題なら、右下の「提出結果」でログインしてから「提出」を押します。確認のダイアログで「提出する」を選ぶと送り、判定を追います。期間の外の問題では、「コードをコピーして公式の提出ページを開く」が出ます。

機能ごとの詳しい使い方は [docs/usage.md](docs/usage.md) にあります。

## 開発者向け

- 開発の進め方・コマンド：[CLAUDE.md](CLAUDE.md)
- 公開しているリポジトリの `docs/` には、使い方（[docs/usage.md](docs/usage.md)）だけを入れています。要求の原典・設計判断・進捗・作業の記録は入れていません（CLAUDE.md やコードのコメントに出てくる `docs/` の中のほかのファイルは、公開していません）

Windows には対応していません。

## ライセンス

[MIT](LICENSE)。依存しているライブラリ（`package.json`・`src-tauri/Cargo.toml`）は、それぞれのライセンスに従います（配るアプリに入るものの一覧と全文は [THIRD_PARTY_LICENSES.txt](THIRD_PARTY_LICENSES.txt)）。
