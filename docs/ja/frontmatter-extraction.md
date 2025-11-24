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

const result = await processor.process(markdown, 'id');

// Frontmatterデータにアクセス
console.log(result.frontmatter.title); // "サンプル記事"
console.log(result.frontmatter.author); // "山田太郎"
console.log(result.frontmatter.date); // "2024-01-15"
console.log(result.frontmatter.tags); // ["markdown", "プロセッサ"]
console.log(result.frontmatter.published); // true

// 生成されたHTMLには frontmatter は含まれません
console.log(result.html); // "<h1 id="id-1">記事の本文</h1>..."
```

Frontmatterデータは以下のような用途で活用できます:

- ブログ記事のメタデータ管理
- テンプレートエンジンとの連携
- 記事の検索・フィルタリング
- SEO情報の抽出
- カスタムレンダリングロジックの制御

注意: MarkDecoプロセッサ自身は、Frontmatterの情報を使用しません。
後述のプラグインは、プラグインの実装によっては情報を使用する可能性があります。
Frontmatter のスカラー値は JSON スキーマで解析され、`null` / `true` / `false` / 数値 / 文字列といった JSON 互換型で受け取れます。

### 先頭H1からのtitle自動抽出

Markdown本文で最初の（ホワイトスペースを除いた）ブロックがH1見出しの場合、
MarkDecoはデフォルトでその見出し文字列を `frontmatter.title` に書き込み、元のH1を本文から取り除きます。
`h1TitleTransform` オプションで挙動を切り替えられます:

- `extractAndRemove` (デフォルト): H1の文字列を `frontmatter.title` に書き込み、本文から見出しを削除する。
- `extract`: `frontmatter.title` に書き込むが、H1見出しは本文に残す。
- `none`: title抽出を行わない。

既に frontmatter に `title` が存在する場合、`extract`または`extractAndRemove` はH1だけを削除し、`title`は上書きしません。
この機能を無効化するには `processor.process(markdown, prefix, { h1TitleTransform: 'none' })` を指定してください。

`processWithFrontmatterTransform` の pre 変換は抽出前に実行されるため、この自動タイトルを参照できない点には留意してください。

### 処理中にFrontmatterを更新する

レンダリング前にメタデータを調整したい場合は、`processor.processWithFrontmatterTransform` を利用します。
第3引数の **pre** 変換関数には解析済みの frontmatter（参照渡し）、呼び出し元から渡された `uniqueIdPrefix`、そして frontmatter を取り除いた Markdown 本文が渡されます。

`undefined` を返すと処理全体が中断され、Markdown→HTML 変換は行われません。
処理を続行する場合は、レンダリングに使用する frontmatter と見出し・プラグインに適用したい `uniqueIdPrefix` を含む `FrontmatterTransformResult` オブジェクトを返します。
さらに、第4引数として **post** 変換関数を渡すと、HTML 変換が完了した後に `{ frontmatter, headingTree }` を受け取り仕上げ加工が可能です。

```typescript
const result = await processor.processWithFrontmatterTransform(
  markdown,
  'id',
  async ({ originalFrontmatter, uniqueIdPrefix }) => {
    if (!originalFrontmatter || originalFrontmatter.status !== 'draft') {
      // 下書きでなければ処理をキャンセル（変換をスキップ）
      return undefined;
    }

    return {
      frontmatter: {
        ...originalFrontmatter,
        status: 'published',
        updatedAt: new Date().toISOString(),
      },
      uniqueIdPrefix,
    };
  },
  async ({ frontmatter, headingTree }) => ({
    ...frontmatter,
    headingCount: headingTree.length,
  })
);

if (!result) {
  // undefined が返されたため、HTML は生成されません。
  return;
}

if (result.changed) {
  const updatedMarkdown = result.composeMarkdown();
  // メタデータが変化したときだけ、更新後の Markdown 文字列を保存します。
}

// 実際に使用されたプレフィックスを確認できます（オーバーライド時に便利）。
console.log(result.uniqueIdPrefix);
```

レンダリング時の各種オプションを併用したい場合は、最後の引数に従来どおり `ProcessOptions` を渡せます。
同様に `{ frontmatter: originalFrontmatter, uniqueIdPrefix: 'id' }` を返せばメタデータは変更せず、プレフィックスだけを切り替えることも可能です。

`result.changed` は変換関数がメタデータを変更したかを示します。
変更があった場合は `composeMarkdown()` が反映済みの frontmatter を含む Markdown を返し、変更がない場合は入力された Markdown をそのまま返すため、不要な書き込みを避けられます。
`result.uniqueIdPrefix` を確認すると、最終的に適用されたプレフィックスが分かります。Post 変換では `{ frontmatter, headingTree }` を受け取り、同じ参照を返せば「変更なし」を示せます。
