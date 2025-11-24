import {
  createMarkdownProcessor,
  createOEmbedPlugin,
  createCardPlugin,
  createMermaidPlugin,
  defaultProviderList,
  type FetcherType,
  type MarkdownProcessor,
} from 'mark-deco';
import * as testHelpers from '../test-shared/test-helpers.js';

const { createTestCustomProviders } = testHelpers;

// Window型拡張
declare global {
  interface Window {
    E2E_TEST_SERVER_PORT?: number;
    processor?: MarkdownProcessor;
    initializeProcessor?: (port: number) => Promise<MarkdownProcessor>;
  }
}

// E2Eテスト用のカスタムプロバイダー設定（共通ライブラリを使用）

// グローバル変数でプロセッサを管理
let processor: MarkdownProcessor | undefined;

// プロセッサ初期化関数
async function initializeProcessor(
  testServerPort: number
): Promise<MarkdownProcessor> {
  const providerList = [
    ...createTestCustomProviders(testServerPort),
    ...defaultProviderList,
  ];

  // 正しいオプション形式でoEmbedプラグインを初期化
  const oembedPlugin = createOEmbedPlugin(providerList, {
    maxRedirects: 2,
    timeoutEachRedirect: 5000,
  });

  const cardPlugin = createCardPlugin();
  const mermaidPlugin = createMermaidPlugin();

  // FetcherType形式に準拠したオブジェクトを作成
  // 既にブラウザに注入されているグローバルなモックfetchを使用
  const browserFetcher: FetcherType = {
    rawFetcher: async (
      url: string,
      accept: string,
      signal: AbortSignal | undefined
    ) => {
      const headers: Record<string, string> = {
        Accept: accept,
      };

      const init: RequestInit = { headers };
      if (signal) {
        init.signal = signal;
      }

      // グローバルなモックfetchを使用（browser-utils.tsで注入済み）
      return await window.fetch(url, init);
    },
    userAgent: 'mark-deco-e2e-test/1.0.0',
  };

  processor = createMarkdownProcessor({
    plugins: [oembedPlugin, cardPlugin, mermaidPlugin],
    fetcher: browserFetcher,
  });

  return processor;
}

// DOM読み込み完了後の初期化
document.addEventListener('DOMContentLoaded', async () => {
  const markdownInput = document.getElementById(
    'markdown-input'
  ) as HTMLTextAreaElement;
  const processButton = document.getElementById(
    'process-button'
  ) as HTMLButtonElement;
  const htmlOutput = document.getElementById('html-output') as HTMLDivElement;

  if (!markdownInput || !processButton || !htmlOutput) {
    console.error('❌ Required DOM elements not found');
    return;
  }

  // テストサーバーポートをwindowオブジェクトから取得
  const testServerPort = window.E2E_TEST_SERVER_PORT || 12347;

  // プロセッサを初期化
  try {
    const instance = await initializeProcessor(testServerPort);
    htmlOutput.innerHTML = 'Ready to process markdown...';
    htmlOutput.className = '';
    window.processor = instance;
  } catch (error) {
    console.error('❌ Failed to initialize processor:', error);
    htmlOutput.innerHTML = 'Error: Failed to initialize processor';
    htmlOutput.className = 'error';
    return;
  }

  // プロセスボタンのクリックハンドラ
  processButton.addEventListener('click', async () => {
    if (!processor) {
      htmlOutput.innerHTML = 'Error: Processor not initialized';
      htmlOutput.className = 'error';
      return;
    }

    const markdown = markdownInput.value.trim();
    if (!markdown) {
      htmlOutput.innerHTML = 'Please enter some markdown content...';
      htmlOutput.className = 'loading';
      return;
    }

    try {
      htmlOutput.innerHTML = 'Processing...';
      htmlOutput.className = 'loading';

      // Parse frontmatter to get idPrefix if available
      let idPrefix = 'id'; // default
      const frontmatterMatch = markdown.match(
        /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/
      );
      if (frontmatterMatch) {
        try {
          // Simple YAML parsing for idPrefix only
          const yamlContent = frontmatterMatch[1];
          if (!yamlContent) {
            throw new Error('Frontmatter capture missing');
          }
          const idPrefixMatch = yamlContent.match(
            /^idPrefix:\s*["']?([^"'\n\r]+)["']?$/m
          );
          const matchedIdPrefix = idPrefixMatch?.[1];
          if (matchedIdPrefix) {
            idPrefix = matchedIdPrefix.trim();
          }
        } catch (error) {
          console.warn(
            '⚠️ Failed to parse frontmatter for idPrefix, using default:',
            error
          );
        }
      }

      // マークダウンを処理
      const result = await processor.process(markdown, idPrefix, {
        h1TitleTransform: 'none',
      });

      // 結果を表示
      htmlOutput.innerHTML = result.html;
      htmlOutput.className = '';
    } catch (error) {
      console.error('❌ Processing error:', error);
      htmlOutput.innerHTML = `Error: ${error instanceof Error ? error.message : String(error)}`;
      htmlOutput.className = 'error';
    }
  });

  // グローバルアクセス用（テストから参照可能）
  window.initializeProcessor = initializeProcessor;
});

// エラー処理用スタイルを追加
const style = document.createElement('style');
style.textContent = `
  .error {
    color: #d32f2f;
    background-color: #ffebee;
    border: 1px solid #ffcdd2;
  }
`;
document.head.appendChild(style);
