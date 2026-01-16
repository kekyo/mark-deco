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
  'MyApp/1.0', // ユーザーエージェント
  60000, // タイムアウト（ミリ秒）
  memoryStorage // キャッシュストレージ
);
```

#### ローカルストレージ（ブラウザ環境）

```typescript
import { createLocalCacheStorage } from 'mark-deco/browser';

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
const fetcher = createCachedFetcher('MyApp/1.0', 60000, fileStorage, {
  cache: true, // キャッシュの有効/無効
  cacheTTL: 30 * 60 * 1000, // キャッシュ生存時間（30分）
  cacheFailures: true, // 失敗したリクエストもキャッシュ
  failureCacheTTL: 5 * 60 * 1000, // 失敗キャッシュの生存時間（5分）
});
```

フェッチ失敗時のキャッシュ動作:

- 成功キャッシュ: 成功したレスポンスは指定されたTTLまで保持され、失敗時でも削除されません。
- 失敗キャッシュ: `cacheFailures`が`true`の場合、失敗も個別のTTL（`failureCacheTTL`）でキャッシュされます。
- 古いデータ保護: 新しいリクエストが失敗しても、既存の成功キャッシュは影響を受けません。

キャッシュにより、同一のURLに対する重複したリクエストを削減し、パフォーマンスを向上させます。
