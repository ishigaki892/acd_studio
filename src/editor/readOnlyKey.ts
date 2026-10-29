// 読み取り専用のタブ（作業領域の外の標準ライブラリ・依存クレートのソース。Phase 3b-2 作業 5。D-133）のキー。
// 作業領域のファイルのタブのキーは作業領域のルートからの相対パスで、読み取り専用のタブのキーは
// rust-analyzer が返した file: の URI。相対パスが file: で始まることはないので、これで見分ける
export function isReadOnlyKey(key: string): boolean {
  return key.startsWith("file://");
}
