// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

// Type exports
export * from './types';

// Main exports
export { createMarkdownProcessor, defaultHtmlOptions } from './processor';
export { createOEmbedPlugin } from './plugins/oembed-plugin';
export { createCardPlugin } from './plugins/card-plugin';
export { createMermaidPlugin } from './plugins/mermaid-plugin';

// oEmbed specific exports
export { defaultProviderList } from './plugins/oembed/providers';

// Utility exports
export { generateHeadingId, fetchData, fetchText, fetchJson } from './utils';

// Fetcher exports
export { createCachedFetcher, createDirectFetcher } from './fetcher';
export type { CachedFetcherOptions } from './fetcher';

// Cache exports
export { createMemoryCacheStorage, generateCacheKey } from './cache/index';
export type { CacheStorage } from './cache/index';

// Logger exports
export { getNoOpLogger, getConsoleLogger } from './logger';

// oEmbed specific type exports
export type { OEmbedProvider } from './plugins/oembed/types';
