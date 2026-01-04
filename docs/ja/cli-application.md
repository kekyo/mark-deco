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
      --heading-base-level <level> 見出しベースレベル (デフォルト: 1)
      --header-title-transform <mode>
                                   先頭ベース見出しの扱い (extract / extractAndRemove / none, デフォルト: extractAndRemove)
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
  "headingBaseLevel": 1,
  "headerTitleTransform": "extractAndRemove",
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
