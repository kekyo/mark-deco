# MarkDeco

TypeScriptで書かれた、高機能なMarkdown-->HTML変換ライブラリ

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/kekyo/mark-deco/actions/workflows/ci.yml/badge.svg)](https://github.com/kekyo/mark-deco/actions/workflows/ci.yml)

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

----

## Frontmatter情報の取得

MarkDecoは、Markdownファイルの先頭にある"YAML frontmatter"を自動的に解析し、処理結果として提供します。Frontmatterは記事のメタデータ（タイトル、著者、タグ、公開日など）を記述するために使用されます。

```typescript
const markdown = `---
title: "サンプル記事"
author: "山田太郎"
date: "2024-01-15"
tags:
  - markdown
  - プロセッサ
published: true
---

# 記事の本文

この記事では...`;

const result = await processor.process(markdown, "id");

// Frontmatterデータにアクセス
console.log(result.frontmatter.title);     // "サンプル記事"
console.log(result.frontmatter.author);    // "山田太郎"
console.log(result.frontmatter.date);      // Date object: 2024-01-15T00:00:00.000Z
console.log(result.frontmatter.tags);      // ["markdown", "プロセッサ"]
console.log(result.frontmatter.published); // true

// 生成されたHTMLには frontmatter は含まれません
console.log(result.html); // "<h1 id="id-1">記事の本文</h1>..."
```

Frontmatterデータは以下のような用途で活用できます:

* ブログ記事のメタデータ管理
* テンプレートエンジンとの連携
* 記事の検索・フィルタリング
* SEO情報の抽出
* カスタムレンダリングロジックの制御

注意: MarkDecoプロセッサ自身は、Frontmatterの情報を使用しません。後述のプラグインは、プラグインの実装によっては情報を使用する可能性があります。

## 見出しID生成と見出し情報の取得

プロセッサーはドキュメント内のすべての見出し (H1〜H6) に対して一意のIDを自動生成します。これらのIDはアンカーリンクやナビゲーションに使用できます。ID生成は2つのモードをサポートし、非ASCII文字に対する高度な処理を含みます。

IDはHTMLに埋め込まれますが、処理結果の`headingTree`プロパティからも公開されます。この情報を使用して、目次生成やドキュメント構造解析などを行うこともできます:

```typescript
const markdown = `# はじめに

これは導入部分です。

# 使い方

基本的な使い方を説明します。

## サブセクション

これはH2見出しのサブセクションです。

# まとめ

これは結論部分です。`;

const result = await processor.process(markdown, "id");

// 見出し情報の出力（後述）
console.log(result.headingTree);
```

上記コードで生成されるHTMLの例です（階層的見出しIDがデフォルトで有効）:

```html
<h1 id="id-1">はじめに</h1>
<p>これは導入部分です。</p>
<h1 id="id-2">使い方</h1>
<p>基本的な使い方を説明します。</p>
<h2 id="id-2-1">サブセクション</h2>
<p>これはH2見出しのサブセクションです。</p>
<h1 id="id-3">まとめ</h1>
<p>これは結論部分です。</p>
```

### 階層的見出しID

見出しの階層構造を反映したIDを生成する機能があります。`useHierarchicalHeadingId`オプションが`true`の場合、見出しレベルに基づいた階層的な番号が付与されます。

この機能により、見出しのIDが以下の形式で生成されます:

| 見出しレベル | ID形式 | 例 |
|------------|--------|-----|
| H1 | `id-N` | `id-1`, `id-2`, `id-3` |
| H2 | `id-N-M` | `id-1-1`, `id-1-2`, `id-2-1` |
| H3 | `id-N-M-L` | `id-1-1-1`, `id-1-1-2`, `id-1-2-1` |

これにより、見出し構造が明確になり、ナビゲーションや目次生成において有用です。

`useHierarchicalHeadingId`を`false`にした場合、IDの番号は階層的ではなく、連番として付与されます:

```typescript
const result = await processor.process(
  markdown, "id", {
    // 階層的見出しIDを無効にする
    useHierarchicalHeadingId: false
  });
```

連番方式での見出しID生成例:

| 見出しレベル | ID形式 | 例 |
|------------|--------|-----|
| 全ての見出し | `id-N` | `id-1`, `id-2`, `id-3`, `id-4`, `id-5` |

注：連番方式では見出しレベルに関係なく、ドキュメント内の全ての見出しに順番に番号が付与されます。

### カスタムIDプレフィックス

IDに使用されるプレフィックスをカスタマイズできます。これらは複数のHTMLを連結する場合に、各タグで一意のIDを生成させるために使用できます:

```typescript
// IDプレフィックスを第二引数で指定
// 生成されるID: "id-1", "id-2", "id-3", など
const result = await processor.process(markdown, "id");

// 生成されるID: "section-1", "section-2", "section-3", など
const result = await processor.process(markdown, "section");

// コンテンツベースID (<h?>タグのみ。後述)
const result = await processor.process(markdown, "id", {
  useContentStringHeaderId: true
});

// 複数のHTMLを生成する場合に、IDを完全に一意にする例:
// "id1-1", "id1-2", "id2-1", "id2-2", "id3-1" ...
const results = await Promise.all(
  markdowns.map((markdown, index) => processor.process(markdown, `id${index}`)));
```

### コンテンツベースID

見出しテキストからIDを生成する、コンテンツベースIDを有効にできます:

```typescript
// 見出しに指定したテキストから、人間が推測しやすいIDを生成する
const markdown = `# Hello world

## Another section

### Subsection`;

const result = await processor.process(markdown, "id", {
  useContentStringHeaderId: true
});
```

結果:

```html
<h1 id="hello-world">Hello World</h1>
<h2 id="hello-world-another-section">Another Section</h2>
<h3 id="hello-world-another-section-subsection">Subsection</h3>
```

コンテンツベースIDを使用する場合、プロセッサは様々なテキスト入力を処理するために、洗練されたフォールバック戦略を採用します:

#### ステップ1: Unicode正規化とアクセント除去

ヨーロッパ言語のアクセントをASCII相当文字に正規化します:

* 入力: "Café Naïve"
* 出力: "cafe-naive"

* 入力: "Résumé"
* 出力: "resume"

#### ステップ2: 制御文字の処理

エスケープシーケンスと制御文字をハイフンに変換します:

* 入力: "Section\n\nTitle"
* 出力: "section-title"

* 入力: "Hello\tWorld"
* 出力: "hello-world"

#### ステップ3: ASCII文字抽出

非ASCII文字（日本語、中国語、絵文字など）を除去します:

* 入力: "Hello 世界 World"
* 出力: "hello-world"

* 入力: "🎉 lucky time!"
* 出力: "lucky-time"

#### ステップ4: 無効IDのフォールバック

結果のIDが短すぎる（3文字未満）または空の場合、プロセッサーは一意IDにフォールバックします:

* 入力: "こんにちは"（日本語のみ）
* 出力: "id-1"（フォールバック）

* 入力: "🎉"（絵文字のみ）
* 出力: "id-2"（フォールバック）

* 入力: "A"（短すぎる）
* 出力: "id-3"（フォールバック）

### ID生成例

|入力見出し|生成ID|処理内容|
|:----|:----|:----|
|`"Hello World"`|`"hello-world"`|標準処理|
|`"Café Naïve"`|`"cafe-naive"`|Unicode正規化|
|`"Section\n\nTwo"`|`"section-two"`|制御文字処理|
|`"Hello 世界"`|`"hello"`|非ASCII除去|
|`"こんにちは"`|`"id-1"`|フォールバック（非ASCIIのみ）|
|`"🎉 パーティー"`|`"id-2"`|フォールバック（絵文字+日本語）|
|`"A"`|`"id-3"`|フォールバック（短すぎる）|

注意: 多くのサイトでこのようなコンテンツベースIDが採用されていますが、MarkDecoではデフォルトではありません。
理由は、英語ではない文字でIDを構築しても非常に認識・管理しづらい上に、現在では検索システムがそれを特別高く評価しないからです。

## フェッチャーとキャッシュシステム

MarkDecoは、外部サーバーアクセスを統一的に管理するフェッチャーシステムを提供します。すべての外部サーバーアクセス（oEmbed API呼び出し、ページスクレイピングなど）はフェッチャーを通じて実行され、レスポンスは自動的にキャッシュされます。

### フェッチャーの種類

MarkDecoは2種類のフェッチャーを提供します：

```typescript
import { createCachedFetcher, createDirectFetcher } from 'mark-deco';

// キャッシュ機能付きフェッチャー（推奨）
const cachedFetcher = createCachedFetcher('MyApp/1.0');

// 直接フェッチャー（キャッシュなし）
const directFetcher = createDirectFetcher('MyApp/1.0');
```

### キャッシュストレージの選択

キャッシュストレージは3種類から選択できます：

#### メモリストレージ（デフォルト）

```typescript
import { createCachedFetcher, createMemoryCacheStorage } from 'mark-deco';

const memoryStorage = createMemoryCacheStorage();
const fetcher = createCachedFetcher(
  'MyApp/1.0',        // ユーザーエージェント
  60000,              // タイムアウト（ミリ秒）
  memoryStorage       // キャッシュストレージ
);
```

#### ローカルストレージ（ブラウザ環境）

```typescript
import { createLocalCacheStorage } from 'mark-deco';

const localStorage = createLocalCacheStorage('myapp:');
const fetcher = createCachedFetcher('MyApp/1.0', 60000, localStorage);
```

#### ファイルシステムストレージ（Node.js環境）

```typescript
import { createFileSystemCacheStorage } from 'mark-deco';

// キャッシュファイルの保存先を指定
const fileStorage = createFileSystemCacheStorage('./cache');
const fetcher = createCachedFetcher('MyApp/1.0', 60000, fileStorage);
```

### キャッシュオプション

詳細なキャッシュ動作を制御できます:

```typescript
const fetcher = createCachedFetcher(
  'MyApp/1.0',
  60000,
  fileStorage, {
    cache: true,                    // キャッシュの有効/無効
    cacheTTL: 30 * 60 * 1000,       // キャッシュ生存時間（30分）
    cacheFailures: true,            // 失敗したリクエストもキャッシュ
    failureCacheTTL: 5 * 60 * 1000  // 失敗キャッシュの生存時間（5分）
  }
);
```

フェッチ失敗時のキャッシュ動作:

* 成功キャッシュ: 成功したレスポンスは指定されたTTLまで保持され、失敗時でも削除されません。
* 失敗キャッシュ: `cacheFailures`が`true`の場合、失敗も個別のTTL（`failureCacheTTL`）でキャッシュされます。
* 古いデータ保護: 新しいリクエストが失敗しても、既存の成功キャッシュは影響を受けません。

キャッシュにより、同一のURLに対する重複したリクエストを削減し、パフォーマンスを向上させます。

## 内蔵プラグイン

MarkDecoは、プラグインシステムを持っています。MarkdownからHTMLに変換する過程で、これらのプラグインの効果を追加することが出来ます。以下に内蔵されているプラグインを示します:

|プラグイン名|詳細|
|:----|:----|
|`oembed`|指定されたURLからoEmbed APIにアクセスして、得られるメタデータでHTMLをレンダリングします|
|`card`|指定されたURLのページをスクレイピングして、得られるメタデータでHTMLをレンダリングします|
|`mermaid`|`mermaid.js`のグラフ構文で記述されたコードで、グラフ描画を可能にします|

プラグインを使用するには、以下のように指定します:

```typescript
import {
  createMarkdownProcessor, createCachedFetcher,
  createOEmbedPlugin, defaultProviderList } from 'mark-deco';

// フェッチャーを作成
const fetcher = createCachedFetcher('MyApp/1.0');

// oEmbedプラグインを生成
const oembedPlugin = createOEmbedPlugin(defaultProviderList);

const processor = createMarkdownProcessor({
  plugins: [ oembedPlugin ],   // 使用するプラグイン群を指定する
  fetcher                      // フェッチャーを指定
});

const markdown = `# メディア埋め込みのテスト

YouTube動画のURLを指定 (短縮URL対応)

\`\`\`oembed
https://youtu.be/1La4QzGeaaQ
\`\`\``;

// YouTube動画の埋め込みを行う
const result = await processor.process(markdown, "id");

// 埋め込みHTMLが生成される
console.log(result.html);
```

プラグインによる拡張は、Markdownのコードブロック構文によって行われます。
通常、コードブロック構文は、プログラムコードのシンタックスハイライトで使われますが、プラグインが認識されると、プラグイン名称が指定されたコードブロック構文の内容が、プラグインによって処理されます。

### oEmbedプラグイン

"oEmbed"とは、WebサイトがそのURLを他のサイトに埋め込み表示するためのAPIフォーマット標準です。YouTubeやFlickrなどの主要プラットフォームがoEmbed APIを提供しており、URLを指定するだけで適切な埋め込みコンテンツを取得できます。

oEmbedプラグインを使用すると、YouTube動画、Flickr写真、SNS投稿などを簡単に埋め込むことができます。

```typescript
import {
  createMarkdownProcessor, createCachedFetcher,
  createOEmbedPlugin, defaultProviderList } from 'mark-deco';

// フェッチャーを作成
const fetcher = createCachedFetcher('MyApp/1.0');

// デフォルトプロバイダーリストを使用して、oEmbedプラグインを生成
const oembedPlugin = createOEmbedPlugin(defaultProviderList);
const processor = createMarkdownProcessor({
  plugins: [ oembedPlugin ],
  fetcher
});

const markdown = `# メディア埋め込みのテスト

YouTube動画（短縮URL対応）

\`\`\`oembed
https://youtu.be/1La4QzGeaaQ
\`\`\`

Flickr写真

\`\`\`oembed
https://flickr.com/photos/bees/2362225867/
\`\`\`

短縮URL（自動リダイレクト解決）

\`\`\`oembed
https://bit.ly/example-site-page
\`\`\``;

const result = await processor.process(markdown, "id");
```

生成されるHTMLの例を示します（YouTube動画の場合）:

```html
<div class="oembed-container oembed-video">
  <div class="oembed-header">
    <div class="oembed-title">Sample Video Title</div>
    <div class="oembed-author">by Channel Name</div>
    <div class="oembed-provider">from YouTube</div>
  </div>
  <div class="oembed-content">
    <iframe src="https://www.youtube.com/embed/[VIDEO_ID]" 
            frameborder="0" allowfullscreen>
            <!-- プロバイダー固有の実装 ... -->
    </iframe>
  </div>
  <div class="oembed-footer">
    <a href="https://youtu.be/[VIDEO_ID]" target="_blank" rel="noopener noreferrer">
      Watch on YouTube
    </a>
  </div>
</div>
```

#### 対応プロバイダー

oEmbedプラグインは `https://oembed.com/providers.json` で公開されている「デフォルトプロバイダーリスト」を内蔵しています。または、あなたが用意したリストも指定可能です。主要なプロバイダーには以下が含まれます:

|プロバイダー|対応ドメイン|内容|
|:----|:----|:----|
|YouTube|`youtube.com`, `youtu.be`|動画埋め込み|
|Vimeo|`vimeo.com`|動画埋め込み|
|Twitter/X|`twitter.com`, `x.com`|ツイート埋め込み|
|Instagram|`instagram.com`|投稿埋め込み|
|Flickr|`flickr.com`|写真埋め込み|
|TikTok|`tiktok.com`|動画埋め込み|
|Spotify|`spotify.com`|音楽・プレイリスト埋め込み|
|SoundCloud|`soundcloud.com`|音声埋め込み|
|Reddit|`reddit.com`|投稿埋め込み|
|その他|多数のサイト|様々なコンテンツ埋め込み|

デフォルトプロバイダーリストのサイズは大きいです。従って、バンドルサイズを削減したい場合は、ご自身でリストを用意したほうが良いでしょう。`defaultProviderList`を使わなければ、バンドラーは暗黙にそのデータを削減すると考えられます。

#### 表示項目の順序制御

oEmbedプラグインでは、`displayFields`オプションを使用して、表示するメタデータ項目とその表示順序を細かく制御できます:

```typescript
// カスタム表示順序: 埋め込みコンテンツを最初、次にタイトル、最後に外部リンク
const customOrderOEmbedPlugin = createOEmbedPlugin(
  defaultProviderList, {
    displayFields: {
      'embeddedContent': 1,   // 1番目に表示
      'title': 2,             // 2番目に表示
      'externalLink': 3,      // 3番目に表示
    }  // その他の項目は出力しない
  });

// displayFieldsがundefinedの場合はデフォルト順序
const defaultOEmbedPlugin = createOEmbedPlugin(
  defaultProviderList, { });
```

* 各フィールドの数値は、表示項目の順序を表しています。連番である必要はなく、数値が小さいほど先に出力されます。
* `displayFields`を指定しない場合は、全てのメタデータ項目がレンダリングされます。

利用可能な表示制御オプション:

|フィールド|説明|CSSクラス|デフォルト順序|
|:----|:----|:----|:----|
|`title`|コンテンツタイトル|`.oembed-title`|`1`|
|`author`|作者情報|`.oembed-author`|`2`|
|`provider`|プロバイダー情報|`.oembed-provider`|`3`|
|`description`|説明文|`.oembed-description`|`4`|
|`thumbnail`|サムネイル画像|`.oembed-thumbnail`|`5`|
|`embeddedContent`|埋め込みコンテンツ (動画など)|`.oembed-content`|`6`|
|`externalLink`|外部リンク|`a[href]`|`7`|

#### リンクURL制御

oEmbedプラグインでは、`useMetadataUrlLink`オプションを通じて、生成されるコンテンツ内の外部リンクに使用されるURLを制御できます:

```typescript
// Markdownに記述されたURLを使用
const providedLinkOEmbedPlugin = createOEmbedPlugin(
  defaultProviderList, {
    useMetadataUrlLink: false   // Markdownに記述されたURLを使用
  });

// メタデータの正規URLを使用
const metadataLinkOEmbedPlugin = createOEmbedPlugin(
  defaultProviderList, {
    useMetadataUrlLink: true    // oEmbedメタデータの`web_page`URLを使用
  });
```

リンクURL選択優先順位:

|`useMetadataUrlLink`|URLソース優先順位|用途|
|:----|:----|:----|
|`false`|記述URL|元URL(短縮リンクなど)を保持 (デフォルト)|
|`true`|oEmbed `web_page` URL --> 記述URL|プロバイダーの正規URLを使用|

#### リダイレクト解決機能

Markdownに指定されたURLは、短縮URLやリダイレクトされるURLの場合に、自動的に正規化されたURLに解決されます。
oEmbedプロバイダーリストには、正規化されたURLでしかマッチしない場合があるためです:

```markdown
\`\`\`oembed
https://youtu.be/1La4QzGeaaQ    # --> https://youtube.com/watch?v=1La4QzGeaaQ に解決
\`\`\`

\`\`\`oembed
https://bit.ly/shortened-link   # --> 正規化されたURLに解決
\`\`\`
```

リダイレクトは複数回実行される場合があり、その場合は各リダイレクト毎にプロバイダーリストとのマッチングが行われます。

注意: 動作環境がブラウザの場合は、CORS制約で正しく機能しない場合があります。

#### フォールバック表示

指定されたURLが未対応のプロバイダーの場合は、適切なリンク表示が生成されます:

```html
<div class="oembed-container oembed-fallback">
  <div class="oembed-header">
    <div class="oembed-title">External Content</div>
    <div class="oembed-provider">from example.com</div>
  </div>
  <div class="oembed-content">
    <a href="https://example.com/content" target="_blank" rel="noopener noreferrer">
      View content on example.com
    </a>
  </div>
</div>
```

#### CSSクラス

oEmbedプラグインが生成するHTMLには、スタイリング用のCSSクラスが付与されます:

|CSSクラス|適用要素|説明|
|:----|:----|:----|
|`.oembed-container`| コンテナ全体 | oEmbed埋め込み全体のコンテナ |
|`.oembed-video`| コンテナ | 動画コンテンツ用の追加クラス |
|`.oembed-photo`| コンテナ | 写真コンテンツ用の追加クラス |
|`.oembed-link`| コンテナ | リンクコンテンツ用の追加クラス |
|`.oembed-rich`| コンテナ | リッチコンテンツ用の追加クラス |
|`.oembed-header`| ヘッダー部分 | タイトル・作者・プロバイダー情報のコンテナ |
|`.oembed-title`| タイトル要素 | コンテンツのタイトル |
|`.oembed-author`| 作者要素 | 作者・チャンネル名など |
|`.oembed-provider`| プロバイダー要素 | サービス提供者名 |
|`.oembed-description`| 説明要素 | コンテンツの説明文 |
|`.oembed-thumbnail`| サムネイル要素 | サムネイル画像 |
|`.oembed-content`| 埋め込み要素 | iframe や実際のコンテンツ |
|`.oembed-footer`| フッター部分 | 外部リンクなど |
|`.oembed-fallback`| フォールバック要素 | 未対応サイト用フォールバック表示 |

### カードプラグイン

カードプラグインは、指定されたURLのページをスクレイピングして、メタデータ群をレンダリングします。oEmbed APIが提供されていないページでも、情報を取得して統一された形式で表示させることが出来ます。

デフォルトでは、ページから Open Graph Protocol（OGP）メタデータを抽出し、リッチプレビューカードをデザイン可能なHTMLを生成します。その他のメタデータフォーマットでも、抽出ルールを記述することで、柔軟に対応できます。

```typescript
import { createCardPlugin, createCachedFetcher } from 'mark-deco';

// フェッチャーを作成
const fetcher = createCachedFetcher('MyApp/1.0');

// カードプラグインを生成
const cardPlugin = createCardPlugin();

const processor = createMarkdownProcessor({
  plugins: [ cardPlugin ],
  fetcher
});

const markdown = `# 製品レビュー

## GitHubリポジトリ
\`\`\`card
https://github.com/kekyo/async-primitives
\`\`\`

## eBay商品
\`\`\`card
https://www.ebay.com/itm/167556314958
\`\`\``;

const result = await processor.process(markdown, "id");

// リッチカードHTMLが生成される
console.log(result.html);
```

以下は生成されるHTMLの例です (対象のページから得られるメタデータの組によって異なります):

```html
<div class="card-container">
  <a href="[URL]" target="_blank" rel="noopener noreferrer" class="card-link">
    <div class="card-image">
      <img src="[IMAGE_URL]" alt="[TITLE]" loading="lazy" />
    </div>
    <div class="card-body">
      <div class="card-header">
        <div class="card-title">[TITLE]</div>
        <div class="card-provider">
          <img src="[FAVICON]" alt="" class="card-favicon" />
          <span>[SITE_NAME]</span>
        </div>
      </div>
      <div class="card-description">[DESCRIPTION]</div>
    </div>
  </a>
</div>
```

補足: OGPとは、WebページのメタデータをSNSや他のサービスが統一的に取得できるようにするための標準仕様です。各サイトが独自の方法でメタデータを記述することを回避するため、`title`, `description`, `image`, `site_name`などの情報を共通のHTMLメタタグ形式で提供します。これにより、カードプラグインは多くのWebサイトから一貫した形式でメタデータを取得し、統一されたカード表示を実現できます。

#### メタデータ抽出ルール

カードプラグインは、メタデータを抽出するルール定義をサポートします。ルールは正規表現でURLパターンをマッチさせ、CSSセレクタでデータを抽出します:

```typescript
import { createCardPlugin } from 'mark-deco';

const cardPlugin = createCardPlugin({
  scrapingRules: [
    {
      pattern: '^https?://example\\.com/',  // URLパターン
      siteName: 'Example Site',
      fields: {   // フィールド設定群
        title: {         // `title`フィールド設定
          rules: [{ selector: 'h1.main-title', method: 'text' }]
        },
        description: {   // `description`フィールド設定
          rules: [{ selector: '.description', method: 'text' }]
        },
        image: {         // `image`フィールド設定
          rules: [{ selector: '.hero-image img', method: 'attr', attr: 'src' }]
        }
      }
    }
  ]
});
```

`FieldConfig`（フィールド設定）:
- `required`: このフィールドが必須かどうか（boolean）
- `rules`: 抽出ルールの配列。上から順番に試行され、最初に成功したルールの結果が使用されます

`FieldRule`（抽出ルール）:
- `selector`: CSSセレクタ（文字列または配列）
- `method`: 抽出方法（`text`、`attr`、`html`）
- `attr`: `attr`メソッド使用時の属性名
- `multiple`: 複数要素の抽出可否（`boolean`）
- `processor`: 後処理ロジック（正規表現、フィルタ、通貨フォーマットなど）

各フィールドのrulesは配列で定義され、上から順番に試行されます。最初に結果が得られたルールでそのフィールドの抽出は完了し、後続のルールは実行されません。

なお、カスタムのメタデータ抽出ルール群は、標準のOGPメタデータ抽出の前に適用され、より正確な情報取得を可能にします。

#### 抽出方法の選択

抽出ルールの`method`フィールドでは、HTML要素からどのようにデータを取得するかを指定します。以下の3つの方法が利用可能です：

|抽出方法|説明|使用例|
|:----|:----|:----|
|`text`|要素のテキスト内容を取得（HTMLタグは除去）|`<span>Hello World</span>` --> `"Hello World"`|
|`attr`|要素の属性値を取得|`<img src="image.jpg">` --> `"image.jpg"` (attr: `src`)|
|`html`|要素の内部HTMLを取得（HTMLタグ含む）|`<div><b>Bold</b> text</div>` --> `"<b>Bold</b> text"`|

各方法の具体的な使用例：

```typescript
// テキスト抽出の例
{
  selector: 'h1.title',
  method: 'text'   // デフォルト値
}

// 属性抽出の例
{
  selector: 'meta[property="og:image"]',
  method: 'attr',
  attr: 'content'  // 取得する属性名を指定
}

// HTML抽出の例
{
  selector: '.rich-content',
  method: 'html'   // HTMLタグも含めて取得
}
```

`method`を省略した場合、デフォルトで`text`が使用されます。`attr`メソッドを使用する場合は、`attr`フィールドで属性名を指定する必要があります（省略時は`href`が使用されます）。

#### 後処理ロジック

抽出したデータに対して後処理を行うために、`processor`フィールドを使用できます。以下の2つの形式で指定できます:

|形式|詳細|
|:----|:----|
|設定オブジェクト|いくつかの固定的な手法から選択します。組み込みの処理方式なので、ルール全体をJSONで流し込むような使い方で使用できます。|
|関数|関数で独自の処理を記述できます。どのような後処理でも対応できます。|

##### 設定オブジェクト形式

```typescript
{
  selector: '.price',
  method: 'text',
  processor: {
    type: 'currency',
    params: {
      symbol: '¥',
      locale: 'ja-JP'
    }
  }
}
```

利用可能な設定タイプ:

|タイプ|説明|パラメータ例|結果例|
|:----|:----|:----|:----|
|`regex`|正規表現による文字列変換|`replace: [{ pattern: '^Prefix:\\s*', replacement: '' }]`|前置詞除去|
|`filter`|条件による値のフィルタリング|`contains: 'keep', excludeContains: ['exclude']`|特定文字列を含む/含まない値の抽出|
|`slice`|配列の部分取得|`start: 0, end: 3`|最初の3つの要素のみ取得|
|`first`|最初の値のみ取得|（パラメータなし）|`['a', 'b', 'c']` --> `'a'`|
|`currency`|通貨フォーマット|`symbol: '$', locale: 'en-US'`|`'19.99'` --> `'$19.99'`|

複合的な処理例:

```typescript
{
  selector: '.feature-list li',
  method: 'text',
  multiple: true,  // 複数要素を取得
  processor: {
    type: 'filter',
    params: {
      excludeContains: ['広告', '宣伝'],  // 広告文言を除外
      minLength: 10  // 10文字未満の項目を除外
    }
  }
}
```

##### 関数形式

関数形式では、抽出された値の配列と処理コンテキストを受け取り、加工された結果を返します:

```typescript
{
  selector: '.brand-info',
  method: 'text',
  processor: (values, context) => {
    // `values` は抽出されたテキスト配列
    // `context` には変換に使用できる情報が含まれている
    if (values.length === 0 || !values[0]) return undefined;
    const text = values[0];
    const match = text.match(/ブランド:\s*([^の]+)/);
    return match?.[1]?.trim();
  }
}
```

関数形式の`processor`に渡される`context`引数には、以下の情報が含まれています:

|プロパティ|型|説明|使用例|
|:----|:----|:----|:----|
|`$`|`Cheerio`|ページ全体のCheerioインスタンス|`context.$.html()` でページ全体のHTMLを取得|
|`$head`|`Cheerio`|HTML headセクションのCheerioインスタンス|`context.$head('meta[name="description"]')` でメタデータ取得|
|`url`|`string`|処理中のページURL|`context.url` でドメイン抽出やASIN抽出に使用|
|`locale`|`string`|ページの言語・地域情報|`context.locale` で言語固有の処理を実行|

`context`を活用した実用的な例:

```typescript
// URLからIDを抽出する例
processor: (values, context) => {
  const match = context.url.match(/\/dp\/([A-Z0-9]{10,})/);
  return match ? match[1] : undefined;
}

// ドメイン名を抽出する例
processor: (values, context) => {
  try {
    const url = new URL(context.url);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return 'Unknown Site';
  }
}

// 言語に応じた処理を行う例
processor: (values, context) => {
  const isJapanese = context.locale?.startsWith('ja');
  return isJapanese 
    ? values[0]?.replace(/ブランド:\s*/, '')
    : values[0]?.replace(/Brand:\s*/, '');
}
```

#### 表示項目の順序制御

カードプラグインでは、`displayFields`オプションを使用して、表示するメタデータ項目とその表示順序を制御できます:

```typescript
const cardPlugin = createCardPlugin({
  displayFields: {
    'image': 1,       // フィールド名 `image` を最初に表示
    'title': 2,       // フィールド名 `title` を2番目に表示
    'description': 3, // フィールド名 `description` を3番目に表示
    // (その他のメタデータ項目は、取得しても表示しない)
  }
});
```

メタデータフィールド名は、メタデータ抽出ルールのフィールド名に従います。

#### リンクURL制御

カードプラグインでは、`useMetadataUrlLink`オプションを通じて、生成されるカードのクリック可能なリンクに使用されるURLを制御できます：

```typescript
// Markdownに記述されたURLを使用
const providedLinkCardPlugin = createCardPlugin({
  useMetadataUrlLink: false   // Markdownに記述されたURLを使用
});

// メタデータURL (取得したページの正規URL) を使用
const metadataLinkCardPlugin = createCardPlugin({
  useMetadataUrlLink: true    // OGPメタデータの正規URLを使用
});
```

リンクURL選択優先順位:

|`useMetadataUrlLink`|URLソース優先順位|用途|
|:----|:----|:----|
|`false`|記述URL|トラッキングパラメータ付き元URLの保持 (デフォルト)|
|`true`|拡張正規URL --> OGP URL --> ソースURL --> 記述URL|正規化されたURLを期待|

#### フォールバック処理

スクレイピング時にネットワークエラーが発生した場合、プラグインは適切なフォールバック表示を提供します。以下はCORS制限が発生して情報が取得できなかった場合の例です:

```html
<div class="card-container card-fallback">
  <div class="card-body">
    <div class="card-header">
      <div class="card-title">📄 外部コンテンツ</div>
      <div class="card-provider">example.com</div>
    </div>
    <div class="card-description">
      CORS制限 - このサイトはブラウザでのクロスオリジンリクエストをブロックしています
    </div>
    <div class="card-content">
      <a href="[URL]" target="_blank" rel="noopener noreferrer" class="card-external-link">
        → example.comを新しいタブで開く
      </a>
    </div>
  </div>
</div>
```

#### CSSクラス

カードプラグインが生成するHTMLには、スタイリング用のCSSクラスが付与されます:

|CSSクラス|適用要素|説明|
|:----|:----|:----|
|`.card-container`| コンテナ全体 | カード全体のコンテナ |
|`.card-amazon`| コンテナ | Amazon商品用の追加クラス |
|`.card-fallback`| コンテナ | フォールバック表示用の追加クラス |
|`.card-link`| リンク要素 | カード全体のクリック可能なリンク |
|`.card-image`| 画像コンテナ | 画像表示エリア |
|`.card-body`| ボディ部分 | カードの本文エリア |
|`.card-header`| ヘッダー部分 | タイトル・プロバイダー情報のコンテナ |
|`.card-title`| タイトル要素 | カードのタイトル |
|`.card-provider`| プロバイダー要素 | サイト名・ファビコンエリア |
|`.card-favicon`| ファビコン要素 | サイトのファビコン画像 |
|`.card-description`| 説明要素 | カードの説明文 |
|`.card-content`| コンテンツ要素 | フォールバック時の追加コンテンツ |
|`.card-external-link`| 外部リンク要素 | フォールバック時の外部リンク |
|`.card-{fieldName}`| 特定フィールド | 各フィールド名に対応したクラス（例：`.card-price`、`.card-rating`） |

フィールド固有クラスの命名規則:

メタデータ抽出ルールで定義されたフィールド名に基づいて、`.card-{fieldName}`形式のクラスが自動生成されます。例えば、`price`フィールドには`.card-price`、`rating`フィールドには`.card-rating`が付与されます。

### Mermaidプラグイン

Mermaidプラグインを使用すると、[mermaid.js](https://mermaid.js.org/)記法を使用してダイアグラムやフローチャートを作成できます:

```typescript
import { createMarkdownProcessor, createMermaidPlugin, createCachedFetcher } from 'mark-deco';

// フェッチャーを作成
const fetcher = createCachedFetcher('MyApp/1.0');

// Mermaidプラグインを生成
const mermaidPlugin = createMermaidPlugin();

const processor = createMarkdownProcessor({
  plugins: [mermaidPlugin],
  fetcher
});

const markdown = `# ダイアグラム例

\`\`\`mermaid
graph TD
  A[開始] --> B{判定}
  B -->|はい| C[アクション1]
  B -->|いいえ| D[アクション2]
  C --> E[終了]
  D --> E
\`\`\``;

const result = await processor.process(markdown, "id");

// <div class="mermaid">...</div>が含まれる
console.log(result.html);
```

以下のようなHTMLが生成されます:

```html
<div class="mermaid-wrapper">
  <style> { ... } </style>
  <div class="mermaid" id="id-1">graph TD
  A[開始] --&gt; B{判定}
  B --&gt;|はい| C[アクション1]
  B --&gt;|いいえ| D[アクション2]
  C --&gt; E[終了]
  D --&gt; E</div>
</div>
```

注意すべき点として、Mermaidプラグインは実際のSVG図形を生成するのではなく、Mermaidに渡すためのHTMLエレメントを生成することです。つまり、これだけでは図形を描画するには不十分で、HTMLを表示する時にMermaid本体のスクリプト導入も必要です。

生成されるHTMLには以下の特徴があります:

* 図形コードは適切にHTMLエスケープされ、XSS攻撃を防止します。
* `mermaid-wrapper`クラスでラップし、SVGのサイズ制約を上書きするスタイルを含みます。
* デフォルトでユニークIDが付与され、複数の図形がある場合でも適切に識別できます。

Mermaidスクリプト本体の導入方法は、Mermaidのドキュメントを参照してください。以下に簡単な例を示します:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Mermaidレンダリング</title>
  <!-- Mermaid.js CDN -->
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
</head>
<body>
  <div id="content">
    <!-- ここにプロセッサの変換結果HTMLを挿入する -->
  </div>
  <script>
    // Mermaidを初期化
    mermaid.initialize({ 
      startOnLoad: true,
      theme: 'default'
    });
  </script>
</body>
</html>
```

#### ブラウザ環境で動的にHTMLを更新する場合の考慮事項

通常Mermaidは、静的に配置されたMermaidコードをパースしてレンダリングし、インプレイスでSVGタグを挿入することで図形を表示します。
従って、DOM（`innerHTML`など）を動的に更新しても、自動的にSVGタグは生成されません。手動でMermaidの再レンダリングをトリガーする必要があります。

以下は、Mermaid図形を含むHTMLを動的に更新する、簡易的な例です:

```typescript
// Markdownを処理する関数
const processAndUpdate = async () => {
  // ...

  // MarkDecoプロセッサを実行
  const result = await processor.process(markdown, "id");
  
  // DOMを更新
  document.getElementById('output').innerHTML = result.html;
  
  // Mermaid図形が存在する場合
  if (result.html.includes('class="mermaid"')) {
    // DOM更新の完了を待つ (100msec)
    setTimeout(() => {
      // Mermaidを初期化して、SVGを生成させる
      window.mermaid.init(
        undefined,
        document.querySelectorAll('.mermaid:not([data-processed="true"])'));
    }, 100);
  }
};
```

## カスタムプラグインの作成

MarkDecoは、内蔵プラグインだけではなく、自分でプラグインを実装して使用することも出来ます。

プラグインは、Markdownのコードブロック表記をインターセプトすることが出来ます。以下の例では、`foobar`という名前のプラグインに処理が移譲されます:

```markdown
\`\`\`foobar
Custom plugin directive text...
\`\`\`
```

コードブロック内部の、"Custom plugin directive test..."のテキストが、プラグインに渡されます。プラグインはこのテキストを解釈して、独自の機能を提供して下さい:

```typescript
import type { Plugin, PluginContext } from 'mark-deco';

// カスタムプラグインを関数として定義する
const createFooBarPlugin = (): Plugin => {
  // contentにはコードブロックのテキストが、contextには操作に必要な情報や機能が配置されます
  const processBlock = async (content: string, context: PluginContext): Promise<string> => {
    // カスタム処理を実装（以下の例は、単純にテキストをdivで出力する）
    return `<div class="custom-block">${content}</div>`;
  };
  // Pluginオブジェクトを返す
  return {
    name: 'foobar',   // プラグイン名
    processBlock      // プラグインのハンドラ
  };
};

// プラグインの生成と登録
const fooBarPlugin = createFooBarPlugin();
const processor = createMarkdownProcessor({ 
  plugins: [ fooBarPlugin ],
  fetcher
});
```

### PluginContext

プラグインの`processBlock`メソッドには、第二引数として`PluginContext`が渡されます。このオブジェクトには、プラグインが処理を実行するために必要な機能とデータが含まれています：

```typescript
interface PluginContext {
  /** ログ出力用のロガーインスタンス */
  readonly logger: Logger;
  /** 処理中断用のAbortSignal（未指定の場合はundefined） */
  readonly signal: AbortSignal | undefined;
  /** Markdownから抽出されたFrontmatterデータ */
  readonly frontmatter: FrontmatterData;
  /** 一意ID生成関数（プレフィックス+連番形式） */
  readonly getUniqueId: () => string;
  /** HTTP リクエスト用フェッチャー */
  readonly fetcher: FetcherType;
}
```

各プロパティの用途を示します:

|プロパティ|型|説明|使用例|
|:----|:----|:----|:----|
|`logger`|`Logger`| デバッグ情報やエラーログの出力に使用 |
|`signal`|`AbortSignal \| undefined`| 長時間処理の中断に対応する場合に使用 |
|`frontmatter`|`FrontmatterData`| Frontmatterデータに基づいた条件分岐処理 |
|`getUniqueId`|`() => string`| HTML要素にユニークなIDを付与する場合に使用 |
|`fetcher`|`FetcherType`| 外部APIアクセスやページスクレイピングに使用 |

`context`を活用した実用的な例:

```typescript
// URLからIDを抽出する例
processor: (values, context) => {
  const match = context.url.match(/\/dp\/([A-Z0-9]{10,})/);
  return match ? match[1] : undefined;
}

// ドメイン名を抽出する例
processor: (values, context) => {
  try {
    const url = new URL(context.url);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return 'Unknown Site';
  }
}

// 言語に応じた処理を行う例
processor: (values, context) => {
  const isJapanese = context.locale?.startsWith('ja');
  return isJapanese 
    ? values[0]?.replace(/ブランド:\s*/, '')
    : values[0]?.replace(/Brand:\s*/, '');
}
```

#### 表示項目の順序制御

カードプラグインでは、`displayFields`オプションを使用して、表示するメタデータ項目とその表示順序を制御できます:

```typescript
const cardPlugin = createCardPlugin({
  displayFields: {
    'image': 1,       // フィールド名 `image` を最初に表示
    'title': 2,       // フィールド名 `title` を2番目に表示
    'description': 3, // フィールド名 `description` を3番目に表示
    // (その他のメタデータ項目は、取得しても表示しない)
  }
});
```

メタデータフィールド名は、メタデータ抽出ルールのフィールド名に従います。

#### リンクURL制御

カードプラグインでは、`useMetadataUrlLink`オプションを通じて、生成されるカードのクリック可能なリンクに使用されるURLを制御できます：

```typescript
// Markdownに記述されたURLを使用
const providedLinkCardPlugin = createCardPlugin({
  useMetadataUrlLink: false   // Markdownに記述されたURLを使用
});

// メタデータURL (取得したページの正規URL) を使用
const metadataLinkCardPlugin = createCardPlugin({
  useMetadataUrlLink: true    // OGPメタデータの正規URLを使用
});
```

リンクURL選択優先順位:

|`useMetadataUrlLink`|URLソース優先順位|用途|
|:----|:----|:----|
|`false`|記述URL|トラッキングパラメータ付き元URLの保持 (デフォルト)|
|`true`|拡張正規URL --> OGP URL --> ソースURL --> 記述URL|正規化されたURLを期待|

#### フォールバック処理

スクレイピング時にネットワークエラーが発生した場合、プラグインは適切なフォールバック表示を提供します。以下はCORS制限が発生して情報が取得できなかった場合の例です:

```html
<div class="card-container card-fallback">
  <div class="card-body">
    <div class="card-header">
      <div class="card-title">📄 外部コンテンツ</div>
      <div class="card-provider">example.com</div>
    </div>
    <div class="card-description">
      CORS制限 - このサイトはブラウザでのクロスオリジンリクエストをブロックしています
    </div>
    <div class="card-content">
      <a href="[URL]" target="_blank" rel="noopener noreferrer" class="card-external-link">
        → example.comを新しいタブで開く
      </a>
    </div>
  </div>
</div>
```

#### CSSクラス

カードプラグインが生成するHTMLには、スタイリング用のCSSクラスが付与されます:

|CSSクラス|適用要素|説明|
|:----|:----|:----|
|`.card-container`| コンテナ全体 | カード全体のコンテナ |
|`.card-amazon`| コンテナ | Amazon商品用の追加クラス |
|`.card-fallback`| コンテナ | フォールバック表示用の追加クラス |
|`.card-link`| リンク要素 | カード全体のクリック可能なリンク |
|`.card-image`| 画像コンテナ | 画像表示エリア |
|`.card-body`| ボディ部分 | カードの本文エリア |
|`.card-header`| ヘッダー部分 | タイトル・プロバイダー情報のコンテナ |
|`.card-title`| タイトル要素 | カードのタイトル |
|`.card-provider`| プロバイダー要素 | サイト名・ファビコンエリア |
|`.card-favicon`| ファビコン要素 | サイトのファビコン画像 |
|`.card-description`| 説明要素 | カードの説明文 |
|`.card-content`| コンテンツ要素 | フォールバック時の追加コンテンツ |
|`.card-external-link`| 外部リンク要素 | フォールバック時の外部リンク |
|`.card-{fieldName}`| 特定フィールド | 各フィールド名に対応したクラス（例：`.card-price`、`.card-rating`） |

フィールド固有クラスの命名規則:

メタデータ抽出ルールで定義されたフィールド名に基づいて、`.card-{fieldName}`形式のクラスが自動生成されます。例えば、`price`フィールドには`.card-price`、`rating`フィールドには`.card-rating`が付与されます。

### カスタム Unified プラグイン

`remark`と`rehype`プラグインを追加して、`unified`の処理機能を拡張できます。この機能は非常に高度であり、`unified`, `remark`, `rehype`のそれぞれの知識が必要です:

```typescript
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';

const result = await processor.process(
  markdown, "id", {
    // 高度なオプション
    advancedOptions: {
      // remarkプラグインを追加（GFMより前に処理）
      remarkPlugins: [
        remarkMath,                    // 数式サポートを追加
        [remarkToc, { tight: true }]   // オプション付きで目次を追加
      ],
      // rehypeプラグインを追加（HTML生成後に処理）
      rehypePlugins: [
        rehypeKatex,                   // KaTeXで数式をレンダリング
        [rehypeHighlight, {            // オプション付きでシンタックスハイライト
          detect: true,
          subset: ['javascript', 'typescript', 'python']
        }]
      ]
    }
  });
```

----

## CLIアプリケーション

MarkDecoには、コマンドラインからMarkdownファイルを処理するためのCLIアプリケーションが付属しています。標準入力からの読み込み、ファイル処理、設定ファイルを使った詳細なカスタマイズが可能です。

### インストール

```bash
# グローバルインストール
npm install -g mark-deco-cli

# またはnpxで直接実行
npx mark-deco-cli input.md
```

### 基本的な使用方法

```bash
# 標準入力から標準出力へ
echo "# Hello World" | mark-deco-cli

# ファイルを処理
mark-deco-cli -i input.md

# 出力をファイルに保存
mark-deco-cli -i input.md -o output.html
```

### コマンドラインオプション

```
Options:
  -i, --input <file>              入力Markdownファイル (デフォルト: 標準入力)
  -o, --output <file>             出力HTMLファイル (デフォルト: 標準出力)
  -c, --config <file>             設定ファイルのパス
  -p, --plugins <plugins...>      特定のプラグインを有効化 (oembed, card, mermaid)
      --no-plugins                全ての標準プラグインを無効化
      --unique-id-prefix <prefix>  一意IDのプレフィックス (デフォルト: "section")
      --hierarchical-heading-id    階層的見出しIDを使用 (デフォルト: true)
      --content-based-heading-id   コンテンツベース見出しIDを使用 (デフォルト: false)
      --frontmatter-output <file>  FrontmatterをJSONで指定ファイルに出力
      --heading-tree-output <file> 見出しツリーをJSONで指定ファイルに出力
  -h, --help                      ヘルプを表示
  -V, --version                   バージョンを表示
```

### 使用例

```bash
# 基本的なMarkdown処理
echo "# Hello World" | mark-deco-cli

# カスタムIDプレフィックスでファイル処理
mark-deco-cli -i document.md --unique-id-prefix "doc"

# 全プラグインを無効化
mark-deco-cli -i simple.md --no-plugins

# 特定のプラグインのみ有効化
mark-deco-cli -i content.md -p oembed mermaid

# 設定ファイルを使用
mark-deco-cli -i content.md -c config.json

# FrontmatterとHTMLを別々に出力
mark-deco-cli -i article.md -o article.html --frontmatter-output metadata.json
```

### 設定ファイル

JSON形式の設定ファイルでデフォルトオプションを指定できます:

```json
{
  "plugins": ["oembed", "card", "mermaid"],
  "uniqueIdPrefix": "section",
  "hierarchicalHeadingId": true,
  "contentBasedHeadingId": false,
  "oembed": {
    "enabled": true,
    "timeout": 5000
  },
  "card": {
    "enabled": true
  },
  "mermaid": {
    "enabled": true,
    "theme": "default"
  }
}
```

----

## ライセンス

Under MIT.

## 変更履歴

* 0.1.0:
  * First public release.
