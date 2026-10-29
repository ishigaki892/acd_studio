// ファイルの内容とエディタの内容の変換（D-068）。
// CodeMirror は内部で改行を LF にそろえるので、読み込んだときの改行と BOM を覚えておき、保存のときに戻す

const BOM = "﻿";

export type TextFormat = {
  crlf: boolean;
  bom: boolean;
};

// 読み込んだ内容から BOM と改行の種類を覚え、エディタ用の文字列（BOM を外したもの）を返す
export function fromFileContent(raw: string): { text: string; format: TextFormat } {
  const bom = raw.startsWith(BOM);
  const text = bom ? raw.slice(BOM.length) : raw;
  // CRLF があれば CRLF のファイルとして扱う。LF と CRLF が混ざったファイルは、保存すると CRLF にそろう
  const crlf = text.includes("\r\n");
  return { text, format: { crlf, bom } };
}

// エディタの内容を、読み込んだときの改行と BOM に戻す
export function toFileContent(text: string, format: TextFormat): string {
  const withLineEnding = format.crlf ? text.replace(/\n/g, "\r\n") : text;
  return format.bom ? BOM + withLineEnding : withLineEnding;
}
