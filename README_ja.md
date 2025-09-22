# MarkDeco

高機能なMarkdown-->HTML変換ライブラリ

[![Project Status: WIP – Initial development is in progress, but there has not yet been a stable, usable release suitable for the public.](https://www.repostatus.org/badges/latest/wip.svg)](https://www.repostatus.org/#wip)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

|Package|npm|
|:----|:----|
|`mark-deco`|[![npm version](https://img.shields.io/npm/v/mark-deco.svg)](https://www.npmjs.com/package/mark-deco)|
|`mark-deco-cli`|[![npm version](https://img.shields.io/npm/v/mark-deco-cli.svg)](https://www.npmjs.com/package/mark-deco-cli)|

[(English is here)](./README.md)

## これは何？

TypeScriptで書かれた、高機能なMarkdown-->HTML変換ライブラリです。
GitHub Flavored Markdown (GFM) を解釈し、HTMLを出力します。
frontmatter解析、見出し解析、ソースコードの整形、oEmbed/カード/Mermaidグラフのレンダリング、プラグイン拡張によるカスタムコードブロック処理をサポートします。

* Markdownを入力として、HTMLのレンダリングを行うために使用できます。
* シンプルなインターフェイスなので、非常に簡単に使えます。
* 独立性が高く、動作環境の要件がほぼありません。Node.jsやブラウザ環境のどちらでも使えます。
* 組み込みプラグインとして、oEmbed・カード・Mermaid.jsをサポートしています。

## インストール

```bash
npm install mark-deco
```

## 基本的な使用方法

以下に、最もシンプルな使用方法を示します: 

```typescript
import { createMarkdownProcessor, createCachedFetcher } from 'mark-deco';

// メモリにキャッシュするフェッチャーを作成する
const fetcher = createCachedFetcher('MyApp/1.0');

// MarkDecoプロセッサを生成する
const processor = createMarkdownProcessor({
  fetcher
});

// 変換するのMarkdown
const markdown = `---
title: サンプル記事
author: 山田太郎
---

# Hello World

これはテスト記事です。`;

// Markdownを入力してHTMLをレンダリングする
const result = await processor.process(
  markdown,
  "id");     // HTML内のIDのプレフィックス（後述）

// 生成されたHTML
console.log(result.html);
// 抽出されたFrontmatterの情報（後述）
console.log(result.frontmatter);
// 抽出された見出し情報（後述）
console.log(result.headingTree);
```

これにより、以下のようなHTMLがレンダリングされます:

```html
<h1 id="id-1">Hello World</h1>
<p>これはテスト記事です。</p>
```

「フェッチャー」は、外部サーバーにアクセスする処理を抽象化したものです。主にoEmbedプラグインやカードプラグインによる外部API呼び出し、ページスクレイピング時に使用します。詳しくは後述を参照して下さい。
フェッチャーに指定した引数はユーザーエージェント文字列で、外部サーバーにアクセスする際のHTTPリクエストヘッダに適用されます。

MarkDecoプロセッサーによって変換されたHTMLは、読みやすい形式に整形されています。高度なオプションを使用することで、整形条件を細かく調整できます（後述）。

### プロセッサー処理の中断

MarkDecoのプロセッサーエンジン自身は外部サーバーにアクセスすることはありませんが、プラグインが必要に応じて外部サーバーにアクセスする可能性があります（例えば、oEmbed APIを使う場合や、ページのスクレイピングを行う場合）。

そのような場合に処理を中断できるようにするには、ECMAScript標準の `AbortSignal` のインスタンスを渡し、中断シグナルを通知してください:

```typescript
// 中断コントローラー
const abortController = new AbortController();

// ...

// MarkdownをHTMLに変換する
const result = await processor.process(
  markdown, "id",
  { // プロセッサオプションを指定
    signal: abortController.signal,   // キャンセレーション対応
  });
```

`AbortController`や`AbortSignal`の使用方法は、ECMAScriptのドキュメントなどを参照してください。

### CLIインターフェイス

MarkDecoはライブラリですが、MarkDecoを気軽に試すことが出来るCLIインターフェイスもパッケージで公開されています。これを使えば、TypeScriptでコードを書かなくても変換を試行したり、別のコードから独立したアプリケーションとして呼び出せます。

```bash
# 標準入力からMarkdownを受け取って、HTMLを出力する
echo "# Hello World" | mark-deco-cli
```

詳しくは[CLIのドキュメント](./docs/ja/cli-application.md)を参照して下さい。

----

## ドキュメント

MarkDecoには、便利な機能が沢山あります。さらなる詳細は、以下を参照して下さい。

- [Frontmatter情報の取得](./docs/ja/frontmatter-extraction.md) - Markdownファイルの先頭にあるYAML frontmatterから、タイトル、著者、タグ、公開日などのメタデータを抽出
- [見出しID生成と見出し情報の取得](./docs/ja/heading-id-generation.md) - 見出しに対して階層的またはコンテンツベースの命名戦略でユニークなIDを自動生成
- [フェッチャーとキャッシュシステム](./docs/ja/fetcher-and-cache-system.md) - oEmbed APIやページスクレイピング用の外部HTTP要求管理と設定可能なキャッシュ戦略
- [内蔵プラグイン](./docs/ja/built-in-plugins.md) - メディアコンテンツ、ソーシャル投稿、インタラクティブダイアグラムを埋め込むoEmbed、カード、Mermaidプラグイン
- [カスタムプラグインの作成](./docs/ja/creating-custom-plugins.md) - コードブロックインターセプターとunifiedエコシステム統合によるMarkdown処理の拡張用カスタムプラグイン開発
- [CLIアプリケーション](./docs/ja/cli-application.md) - 設定サポートとプラグイン制御を持つMarkdownファイルのバッチ処理用コマンドラインインターフェース

----

## ライセンス

Under MIT.

## 変更履歴

* 0.1.0:
  * First public release.
