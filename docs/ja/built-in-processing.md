## 組み込み処理

MarkDecoは、プラグインシステムやコードハイライトなどの組み込み処理を提供します。以下に内蔵されているプラグインを示します:

| 組み込み処理 | 詳細                                                                                    |
| :----------- | :-------------------------------------------------------------------------------------- |
| コードハイライト | 組み込みのコードハイライトレンダリングを行います |
| `oembed`     | 指定されたURLからoEmbed APIにアクセスして、得られるメタデータでHTMLをレンダリングします |
| `card`       | 指定されたURLのページをスクレイピングして、得られるメタデータでHTMLをレンダリングします |
| `mermaid`    | `mermaid.js`のグラフ構文で記述されたコードで、グラフ描画を可能にします                  |

プラグインを使用するには、以下のように指定します:

```typescript
import {
  createMarkdownProcessor,
  createCachedFetcher,
  createOEmbedPlugin,
  defaultProviderList,
} from 'mark-deco';

// フェッチャーを作成
const fetcher = createCachedFetcher('MyApp/1.0');

// oEmbedプラグインを生成
const oembedPlugin = createOEmbedPlugin(defaultProviderList);

const processor = createMarkdownProcessor({
  plugins: [oembedPlugin], // 使用するプラグイン群を指定する
  fetcher, // フェッチャーを指定
});

const markdown = `# メディア埋め込みのテスト

YouTube動画のURLを指定 (短縮URL対応)

\`\`\`oembed
https://youtu.be/1La4QzGeaaQ
\`\`\``;

// YouTube動画の埋め込みを行う
const result = await processor.process(markdown, 'id');

// 埋め込みHTMLが生成される
console.log(result.html);
```

プラグインによる拡張は、Markdownのコードブロック構文によって行われます。
通常、コードブロック構文は、プログラムコードのシンタックスハイライトで使われますが、プラグインが認識されると、プラグイン名称が指定されたコードブロック構文の内容が、プラグインによって処理されます。

### 組み込みコードハイライト

MarkDecoは [Shiki](https://github.com/shikijs/shiki) + [rehype-pretty-code](https://github.com/rehype-pretty/rehype-pretty-code) によるコードハイライトを内蔵しています。`ProcessOptions` に `codeHighlight` を指定したときだけ有効になります:

```typescript
// コードブロックをmark-decoでレンダリングする
const result = await processor.process(markdown, 'id', {
  codeHighlight: {
    // テーマ定義
    theme: { light: 'github-light', dark: 'github-dark-dimmed' },
    // 行番号を有効化するかどうか
    lineNumbers: true,
    // デフォルトの言語
    defaultLanguage: 'text',
  },
});
```

- 組み込み言語・テーマ一覧: [textmate-grammars-themes](https://textmate-grammars-themes.netlify.app/) (https://shiki.style/themes)

ShikiはMarkdownで指定された言語を自動的にロードします。独自の言語定義や
エイリアスを追加したい場合は、`languageDefinitions` と `languageAliases` を
指定してください。カスタム定義は同名の組み込み言語よりも優先されます。

Shikiの言語/テーマ定義を直接渡して拡張することもできます:

```typescript
import type { LanguageRegistration, ThemeRegistrationRaw } from 'shiki';

const customLanguage: LanguageRegistration = {
  name: 'markdeco-test',
  scopeName: 'source.markdeco-test',
  patterns: [{ name: 'keyword.markdeco', match: '\\\\bMARK\\\\b' }],
};

const customTheme: ThemeRegistrationRaw = {
  name: 'markdeco-test-theme',
  type: 'dark',
  fg: '#111111',
  bg: '#000000',
  settings: [
    { settings: { foreground: '#111111', background: '#000000' } },
    { scope: 'keyword.markdeco', settings: { foreground: '#ff0000' } },
  ],
  tokenColors: [
    { scope: 'keyword.markdeco', settings: { foreground: '#ff0000' } },
  ],
};

const result = await processor.process(markdown, 'id', {
  codeHighlight: {
    languageDefinitions: [customLanguage],
    languageAliases: { 'markdeco-alias': 'markdeco-test' },
    theme: customTheme,
  },
});
```

言語定義を渡した場合は、`name`（`aliases`を含む）がホワイトリストに追加されます。同名の組み込み言語がある場合は、指定した定義が優先されます。

`codeHighlight` を有効にするとコードブロックのメタ情報 (`{...}`) はハイライト用に予約され、`remark-attr` によるコードブロック属性は適用されません。
`advancedOptions.rehypePlugins` で別のコードハイライトを追加する場合は重複適用を避けてください。

Note: `codeHighlight` を適用しなくても、コードハイライトのための基本的なHTMLレンダリングは行われます。
例えば、 [Prism.js](https://prismjs.com/) を使用すれば、ブラウザ内レンダリングで容易にコードハイライトを実現できます。

### oEmbedプラグイン

"oEmbed"とは、WebサイトがそのURLを他のサイトに埋め込み表示するためのAPIフォーマット標準です。YouTubeやFlickrなどの主要プラットフォームがoEmbed APIを提供しており、URLを指定するだけで適切な埋め込みコンテンツを取得できます。

oEmbedプラグインを使用すると、YouTube動画、Flickr写真、SNS投稿などを簡単に埋め込むことができます。

```typescript
import {
  createMarkdownProcessor,
  createCachedFetcher,
  createOEmbedPlugin,
  defaultProviderList,
} from 'mark-deco';

// フェッチャーを作成
const fetcher = createCachedFetcher('MyApp/1.0');

// デフォルトプロバイダーリストを使用して、oEmbedプラグインを生成
const oembedPlugin = createOEmbedPlugin(defaultProviderList);
const processor = createMarkdownProcessor({
  plugins: [oembedPlugin],
  fetcher,
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

const result = await processor.process(markdown, 'id');
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
    <iframe
      src="https://www.youtube.com/embed/[VIDEO_ID]"
      frameborder="0"
      allowfullscreen
    >
      <!-- プロバイダー固有の実装 ... -->
    </iframe>
  </div>
  <div class="oembed-footer">
    <a
      href="https://youtu.be/[VIDEO_ID]"
      target="_blank"
      rel="noopener noreferrer"
    >
      Watch on YouTube
    </a>
  </div>
</div>
```

#### 対応プロバイダー

oEmbedプラグインは `https://oembed.com/providers.json` で公開されている「デフォルトプロバイダーリスト」を内蔵しています。または、あなたが用意したリストも指定可能です。主要なプロバイダーには以下が含まれます:

| プロバイダー | 対応ドメイン              | 内容                       |
| :----------- | :------------------------ | :------------------------- |
| YouTube      | `youtube.com`, `youtu.be` | 動画埋め込み               |
| Vimeo        | `vimeo.com`               | 動画埋め込み               |
| Twitter/X    | `twitter.com`, `x.com`    | ツイート埋め込み           |
| Instagram    | `instagram.com`           | 投稿埋め込み               |
| Flickr       | `flickr.com`              | 写真埋め込み               |
| TikTok       | `tiktok.com`              | 動画埋め込み               |
| Spotify      | `spotify.com`             | 音楽・プレイリスト埋め込み |
| SoundCloud   | `soundcloud.com`          | 音声埋め込み               |
| Reddit       | `reddit.com`              | 投稿埋め込み               |
| その他       | 多数のサイト              | 様々なコンテンツ埋め込み   |

デフォルトプロバイダーリストのサイズは大きいです。従って、バンドルサイズを削減したい場合は、ご自身でリストを用意したほうが良いでしょう。`defaultProviderList`を使わなければ、バンドラーは暗黙にそのデータを削減すると考えられます。

#### 表示項目の順序制御

oEmbedプラグインでは、`displayFields`オプションを使用して、表示するメタデータ項目とその表示順序を細かく制御できます:

```typescript
// カスタム表示順序: 埋め込みコンテンツを最初、次にタイトル、最後に外部リンク
const customOrderOEmbedPlugin = createOEmbedPlugin(defaultProviderList, {
  displayFields: {
    embeddedContent: 1, // 1番目に表示
    title: 2, // 2番目に表示
    externalLink: 3, // 3番目に表示
  }, // その他の項目は出力しない
});

// displayFieldsがundefinedの場合はデフォルト順序
const defaultOEmbedPlugin = createOEmbedPlugin(defaultProviderList, {});
```

- 各フィールドの数値は、表示項目の順序を表しています。連番である必要はなく、数値が小さいほど先に出力されます。
- `displayFields`を指定しない場合は、全てのメタデータ項目がレンダリングされます。

利用可能な表示制御オプション:

| フィールド        | 説明                          | CSSクラス             | デフォルト順序 |
| :---------------- | :---------------------------- | :-------------------- | :------------- |
| `title`           | コンテンツタイトル            | `.oembed-title`       | `1`            |
| `author`          | 作者情報                      | `.oembed-author`      | `2`            |
| `provider`        | プロバイダー情報              | `.oembed-provider`    | `3`            |
| `description`     | 説明文                        | `.oembed-description` | `4`            |
| `thumbnail`       | サムネイル画像                | `.oembed-thumbnail`   | `5`            |
| `embeddedContent` | 埋め込みコンテンツ (動画など) | `.oembed-content`     | `6`            |
| `externalLink`    | 外部リンク                    | `a[href]`             | `7`            |

#### リンクURL制御

oEmbedプラグインでは、`useMetadataUrlLink`オプションを通じて、生成されるコンテンツ内の外部リンクに使用されるURLを制御できます:

```typescript
// Markdownに記述されたURLを使用
const providedLinkOEmbedPlugin = createOEmbedPlugin(defaultProviderList, {
  useMetadataUrlLink: false, // Markdownに記述されたURLを使用
});

// メタデータの正規URLを使用
const metadataLinkOEmbedPlugin = createOEmbedPlugin(defaultProviderList, {
  useMetadataUrlLink: true, // oEmbedメタデータの`web_page`URLを使用
});
```

リンクURL選択優先順位:

| `useMetadataUrlLink` | URLソース優先順位                 | 用途                                     |
| :------------------- | :-------------------------------- | :--------------------------------------- |
| `false`              | 記述URL                           | 元URL(短縮リンクなど)を保持 (デフォルト) |
| `true`               | oEmbed `web_page` URL --> 記述URL | プロバイダーの正規URLを使用              |

#### リダイレクト解決機能

Markdownに指定されたURLは、短縮URLやリダイレクトされるURLの場合に、自動的に正規化されたURLに解決されます。
oEmbedプロバイダーリストには、正規化されたURLでしかマッチしない場合があるためです:

```markdown
\`\`\`oembed
https://youtu.be/1La4QzGeaaQ # --> https://youtube.com/watch?v=1La4QzGeaaQ に解決
\`\`\`

\`\`\`oembed
https://bit.ly/shortened-link # --> 正規化されたURLに解決
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
    <a
      href="https://example.com/content"
      target="_blank"
      rel="noopener noreferrer"
    >
      View content on example.com
    </a>
  </div>
</div>
```

#### CSSクラス

oEmbedプラグインが生成するHTMLには、スタイリング用のCSSクラスが付与されます:

| CSSクラス             | 適用要素           | 説明                                       |
| :-------------------- | :----------------- | :----------------------------------------- |
| `.oembed-container`   | コンテナ全体       | oEmbed埋め込み全体のコンテナ               |
| `.oembed-video`       | コンテナ           | 動画コンテンツ用の追加クラス               |
| `.oembed-photo`       | コンテナ           | 写真コンテンツ用の追加クラス               |
| `.oembed-link`        | コンテナ           | リンクコンテンツ用の追加クラス             |
| `.oembed-rich`        | コンテナ           | リッチコンテンツ用の追加クラス             |
| `.oembed-header`      | ヘッダー部分       | タイトル・作者・プロバイダー情報のコンテナ |
| `.oembed-title`       | タイトル要素       | コンテンツのタイトル                       |
| `.oembed-author`      | 作者要素           | 作者・チャンネル名など                     |
| `.oembed-provider`    | プロバイダー要素   | サービス提供者名                           |
| `.oembed-description` | 説明要素           | コンテンツの説明文                         |
| `.oembed-thumbnail`   | サムネイル要素     | サムネイル画像                             |
| `.oembed-content`     | 埋め込み要素       | iframe や実際のコンテンツ                  |
| `.oembed-footer`      | フッター部分       | 外部リンクなど                             |
| `.oembed-fallback`    | フォールバック要素 | 未対応サイト用フォールバック表示           |

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
  plugins: [cardPlugin],
  fetcher,
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

const result = await processor.process(markdown, 'id');

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
      pattern: '^https?://example\\.com/', // URLパターン
      siteName: 'Example Site',
      fields: {
        // フィールド設定群
        title: {
          // `title`フィールド設定
          rules: [{ selector: 'h1.main-title', method: 'text' }],
        },
        description: {
          // `description`フィールド設定
          rules: [{ selector: '.description', method: 'text' }],
        },
        image: {
          // `image`フィールド設定
          rules: [{ selector: '.hero-image img', method: 'attr', attr: 'src' }],
        },
      },
    },
  ],
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

| 抽出方法 | 説明                                       | 使用例                                                  |
| :------- | :----------------------------------------- | :------------------------------------------------------ |
| `text`   | 要素のテキスト内容を取得（HTMLタグは除去） | `<span>Hello World</span>` --> `"Hello World"`          |
| `attr`   | 要素の属性値を取得                         | `<img src="image.jpg">` --> `"image.jpg"` (attr: `src`) |
| `html`   | 要素の内部HTMLを取得（HTMLタグ含む）       | `<div><b>Bold</b> text</div>` --> `"<b>Bold</b> text"`  |

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

| 形式             | 詳細                                                                                                                   |
| :--------------- | :--------------------------------------------------------------------------------------------------------------------- |
| 設定オブジェクト | いくつかの固定的な手法から選択します。組み込みの処理方式なので、ルール全体をJSONで流し込むような使い方で使用できます。 |
| 関数             | 関数で独自の処理を記述できます。どのような後処理でも対応できます。                                                     |

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

| タイプ     | 説明                         | パラメータ例                                              | 結果例                            |
| :--------- | :--------------------------- | :-------------------------------------------------------- | :-------------------------------- |
| `regex`    | 正規表現による文字列変換     | `replace: [{ pattern: '^Prefix:\\s*', replacement: '' }]` | 前置詞除去                        |
| `filter`   | 条件による値のフィルタリング | `contains: 'keep', excludeContains: ['exclude']`          | 特定文字列を含む/含まない値の抽出 |
| `slice`    | 配列の部分取得               | `start: 0, end: 3`                                        | 最初の3つの要素のみ取得           |
| `first`    | 最初の値のみ取得             | （パラメータなし）                                        | `['a', 'b', 'c']` --> `'a'`       |
| `currency` | 通貨フォーマット             | `symbol: '$', locale: 'en-US'`                            | `'19.99'` --> `'$19.99'`          |

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

| プロパティ | 型        | 説明                                     | 使用例                                                       |
| :--------- | :-------- | :--------------------------------------- | :----------------------------------------------------------- |
| `$`        | `Cheerio` | ページ全体のCheerioインスタンス          | `context.$.html()` でページ全体のHTMLを取得                  |
| `$head`    | `Cheerio` | HTML headセクションのCheerioインスタンス | `context.$head('meta[name="description"]')` でメタデータ取得 |
| `url`      | `string`  | 処理中のページURL                        | `context.url` でドメイン抽出やASIN抽出に使用                 |
| `locale`   | `string`  | ページの言語・地域情報                   | `context.locale` で言語固有の処理を実行                      |

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

#### 表示項目の順序制御

カードプラグインでは、`displayFields`オプションを使用して、表示するメタデータ項目とその表示順序を制御できます:

```typescript
const cardPlugin = createCardPlugin({
  displayFields: {
    image: 1, // フィールド名 `image` を最初に表示
    title: 2, // フィールド名 `title` を2番目に表示
    description: 3, // フィールド名 `description` を3番目に表示
    // (その他のメタデータ項目は、取得しても表示しない)
  },
});
```

メタデータフィールド名は、メタデータ抽出ルールのフィールド名に従います。

#### リンクURL制御

カードプラグインでは、`useMetadataUrlLink`オプションを通じて、生成されるカードのクリック可能なリンクに使用されるURLを制御できます：

```typescript
// Markdownに記述されたURLを使用
const providedLinkCardPlugin = createCardPlugin({
  useMetadataUrlLink: false, // Markdownに記述されたURLを使用
});

// メタデータURL (取得したページの正規URL) を使用
const metadataLinkCardPlugin = createCardPlugin({
  useMetadataUrlLink: true, // OGPメタデータの正規URLを使用
});
```

リンクURL選択優先順位:

| `useMetadataUrlLink` | URLソース優先順位                                 | 用途                                               |
| :------------------- | :------------------------------------------------ | :------------------------------------------------- |
| `false`              | 記述URL                                           | トラッキングパラメータ付き元URLの保持 (デフォルト) |
| `true`               | 拡張正規URL --> OGP URL --> ソースURL --> 記述URL | 正規化されたURLを期待                              |

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
      CORS制限 -
      このサイトはブラウザでのクロスオリジンリクエストをブロックしています
    </div>
    <div class="card-content">
      <a
        href="[URL]"
        target="_blank"
        rel="noopener noreferrer"
        class="card-external-link"
      >
        → example.comを新しいタブで開く
      </a>
    </div>
  </div>
</div>
```

#### CSSクラス

カードプラグインが生成するHTMLには、スタイリング用のCSSクラスが付与されます:

| CSSクラス             | 適用要素         | 説明                                                                |
| :-------------------- | :--------------- | :------------------------------------------------------------------ |
| `.card-container`     | コンテナ全体     | カード全体のコンテナ                                                |
| `.card-amazon`        | コンテナ         | Amazon商品用の追加クラス                                            |
| `.card-fallback`      | コンテナ         | フォールバック表示用の追加クラス                                    |
| `.card-link`          | リンク要素       | カード全体のクリック可能なリンク                                    |
| `.card-image`         | 画像コンテナ     | 画像表示エリア                                                      |
| `.card-body`          | ボディ部分       | カードの本文エリア                                                  |
| `.card-header`        | ヘッダー部分     | タイトル・プロバイダー情報のコンテナ                                |
| `.card-title`         | タイトル要素     | カードのタイトル                                                    |
| `.card-provider`      | プロバイダー要素 | サイト名・ファビコンエリア                                          |
| `.card-favicon`       | ファビコン要素   | サイトのファビコン画像                                              |
| `.card-description`   | 説明要素         | カードの説明文                                                      |
| `.card-content`       | コンテンツ要素   | フォールバック時の追加コンテンツ                                    |
| `.card-external-link` | 外部リンク要素   | フォールバック時の外部リンク                                        |
| `.card-{fieldName}`   | 特定フィールド   | 各フィールド名に対応したクラス（例：`.card-price`、`.card-rating`） |

フィールド固有クラスの命名規則:

メタデータ抽出ルールで定義されたフィールド名に基づいて、`.card-{fieldName}`形式のクラスが自動生成されます。例えば、`price`フィールドには`.card-price`、`rating`フィールドには`.card-rating`が付与されます。

### Mermaidプラグイン

Mermaidプラグインを使用すると、[mermaid.js](https://mermaid.js.org/)記法を使用してダイアグラムやフローチャートを作成できます:

```typescript
import {
  createMarkdownProcessor,
  createMermaidPlugin,
  createCachedFetcher,
} from 'mark-deco';

// フェッチャーを作成
const fetcher = createCachedFetcher('MyApp/1.0');

// Mermaidプラグインを生成
const mermaidPlugin = createMermaidPlugin();

const processor = createMarkdownProcessor({
  plugins: [mermaidPlugin],
  fetcher,
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

const result = await processor.process(markdown, 'id');

// <div class="mermaid">...</div>が含まれる
console.log(result.html);
```

以下のようなHTMLが生成されます:

```html
<div class="mermaid-wrapper">
  <style>
    { ... }
  </style>
  <div class="mermaid" id="id-1">
    graph TD A[開始] --&gt; B{判定} B --&gt;|はい| C[アクション1] B
    --&gt;|いいえ| D[アクション2] C --&gt; E[終了] D --&gt; E
  </div>
</div>
```

注意すべき点として、Mermaidプラグインは実際のSVG図形を生成するのではなく、Mermaidに渡すためのHTMLエレメントを生成することです。つまり、これだけでは図形を描画するには不十分で、HTMLを表示する時にMermaid本体のスクリプト導入も必要です。

生成されるHTMLには以下の特徴があります:

- 図形コードは適切にHTMLエスケープされ、XSS攻撃を防止します。
- `mermaid-wrapper`クラスでラップし、SVGのサイズ制約を上書きするスタイルを含みます。
- デフォルトでユニークIDが付与され、複数の図形がある場合でも適切に識別できます。

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
        theme: 'default',
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
  const result = await processor.process(markdown, 'id');

  // DOMを更新
  document.getElementById('output').innerHTML = result.html;

  // Mermaid図形が存在する場合
  if (result.html.includes('class="mermaid"')) {
    // DOM更新の完了を待つ (100msec)
    setTimeout(() => {
      // Mermaidを初期化して、SVGを生成させる
      window.mermaid.init(
        undefined,
        document.querySelectorAll('.mermaid:not([data-processed="true"])')
      );
    }, 100);
  }
};
```
