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
console.log(result.frontmatter.date); // Date object: 2024-01-15T00:00:00.000Z
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

注意: MarkDecoプロセッサ自身は、Frontmatterの情報を使用しません。後述のプラグインは、プラグインの実装によっては情報を使用する可能性があります。

### 処理中にFrontmatterを更新する

レンダリング前にメタデータを調整したい場合は、`ProcessOptions` の `frontmatterTransform` を利用します。コールバックには解析済みの frontmatter と、frontmatter を取り除いた Markdown 本文が渡されます。変更が不要なときは `undefined` を返し、更新したい場合は新しいオブジェクトを返します。

```typescript
const result = await processor.process(markdown, 'id', {
  frontmatterTransform: ({ originalFrontmatter }) => {
    if (!originalFrontmatter || originalFrontmatter.status !== 'draft') {
      return undefined;
    }

    return {
      ...originalFrontmatter,
      status: 'published',
      updatedAt: new Date().toISOString(),
    };
  },
});

if (result.changed) {
  const updatedMarkdown = result.composeMarkdown();
  // メタデータが変化したときだけ、更新後のMarkdown文字列を保存します
}
```

`ProcessResult.changed` は `frontmatterTransform` がメタデータを変更したかを示します。変更があった場合は `composeMarkdown()` が反映済みの frontmatter を含む Markdown を返し、変更がない場合は入力された Markdown をそのまま返すため、不要な書き込みを避けられます。
