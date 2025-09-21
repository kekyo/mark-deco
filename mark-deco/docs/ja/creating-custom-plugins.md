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
