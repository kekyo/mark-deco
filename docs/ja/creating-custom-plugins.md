## カスタムプラグインの作成

mark-decoは、内蔵プラグインだけではなく、自分でプラグインを実装して使用することも出来ます。

プラグインは、Markdownのコードブロック表記をインターセプトすることが出来ます。以下の例では、`foobar`という名前のプラグインに処理が移譲されます:

```markdown
\`\`\`foobar
Custom plugin directive text...
\`\`\`
```

コードブロック内部の、"Custom plugin directive test..."のテキストが、プラグインに渡されます。プラグインはこのテキストを解釈して、独自の機能を提供して下さい:

```typescript
import type { MarkdownProcessorPlugin, MarkdownProcessorPluginContext } from 'mark-deco';

// カスタムプラグインを関数として定義する
const createFooBarPlugin = (): Plugin => {
  // contentにはコードブロックのテキストが、contextには操作に必要な情報や機能が配置されます
  const processBlock = async (
    content: string,
    context: MarkdownProcessorPluginContext
  ): Promise<string> => {
    // カスタム処理を実装（以下の例は、単純にテキストをdivで出力する）
    return `<div class="custom-block">${content}</div>`;
  };
  // Pluginオブジェクトを返す
  return {
    name: 'foobar', // プラグイン名
    processBlock, // プラグインのハンドラ
  };
};

// プラグインの生成と登録
const fooBarPlugin = createFooBarPlugin();
const processor = createMarkdownProcessor({
  plugins: [fooBarPlugin],
  fetcher,
});
```

### MarkdownProcessorPluginContext

プラグインの`processBlock`メソッドには、第二引数として`MarkdownProcessorPluginContext`が渡されます。このオブジェクトには、プラグインが処理を実行するために必要な機能とデータが含まれています：

```typescript
interface MarkdownProcessorPluginContext {
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

| プロパティ    | 型                         | 説明                                        | 使用例 |
| :------------ | :------------------------- | :------------------------------------------ | :----- |
| `logger`      | `Logger`                   | デバッグ情報やエラーログの出力に使用        |
| `signal`      | `AbortSignal \| undefined` | 長時間処理の中断に対応する場合に使用        |
| `frontmatter` | `FrontmatterData`          | Frontmatterデータに基づいた条件分岐処理     |
| `getUniqueId` | `() => string`             | HTML要素にユニークなIDを付与する場合に使用  |
| `fetcher`     | `FetcherType`              | 外部APIアクセスやページスクレイピングに使用 |

`context`を活用した実用的な例:

```typescript
// URLからIDを抽出する例
processor: (values, context) => {
  const match = context.url.match(/\/dp\/([A-Z0-9]{10,})/);
  return match ? match[1] : undefined;
};

// ドメイン名を抽出する例
processor: (values, context) => {
  try {
    const url = new URL(context.url);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return 'Unknown Site';
  }
};

// 言語に応じた処理を行う例
processor: (values, context) => {
  const isJapanese = context.locale?.startsWith('ja');
  return isJapanese
    ? values[0]?.replace(/ブランド:\s*/, '')
    : values[0]?.replace(/Brand:\s*/, '');
};
```

### カスタム Unified プラグイン

`remark`と`rehype`プラグインを追加して、`unified`の処理機能を拡張できます。この機能は非常に高度であり、`unified`, `remark`, `rehype`のそれぞれの知識が必要です:

```typescript
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';

const result = await processor.process(markdown, 'id', {
  // 高度なオプション
  advancedOptions: {
    // remarkプラグインを追加（GFMより前に処理）
    remarkPlugins: [
      remarkMath, // 数式サポートを追加
      [remarkToc, { tight: true }], // オプション付きで目次を追加
    ],
    // rehypeプラグインを追加（HTML生成後に処理）
    rehypePlugins: [
      rehypeKatex, // KaTeXで数式をレンダリング
      [
        rehypeHighlight,
        {
          // オプション付きでシンタックスハイライト
          detect: true,
          subset: ['javascript', 'typescript', 'python'],
        },
      ],
    ],
  },
});
```
