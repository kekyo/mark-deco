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
