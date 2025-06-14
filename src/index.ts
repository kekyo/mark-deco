// Main exports
export { createMarkdownProcessor, defaultHtmlOptions } from './processor.js';
export { createOEmbedPlugin } from './plugins/oembed-plugin.js';
export { createCardPlugin } from './plugins/card-plugin.js';
export { createMermaidPlugin } from './plugins/mermaid-plugin.js';

// oEmbed specific exports
export { defaultProviderList } from './plugins/oembed/providers.js';

// Utility exports
export { createCachedFetcher, createDirectFetcher, generateHeadingId } from './utils.js';
export type { CachedFetcherOptions } from './utils.js';

// Cache exports
export { createMemoryCacheStorage, createLocalCacheStorage, createFileSystemCacheStorage, generateCacheKey } from './cache/index.js';
export type { CacheStorage } from './cache/index.js';

// Logger exports
export { getNoOpLogger, getConsoleLogger } from './logger.js';

// Type exports
export type {
  Plugin,
  PluginContext,
  MarkdownProcessor,
  ProcessOptions,
  ProcessResult,
  FrontmatterData,
  Logger,
  LogLevel,
  FetcherType
} from './types.js';

// oEmbed specific type exports
export type { OEmbedProvider } from './plugins/oembed/types.js';
