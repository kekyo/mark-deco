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
