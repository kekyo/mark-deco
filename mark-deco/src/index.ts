// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

// Type exports
export * from './types';
export * from './plugins/oembed/types';
export * from './plugins/card/types';
export * from './plugins/mermaid/types';

// Main exports
export { createMarkdownProcessor, defaultHtmlOptions } from './processor';
export { createOEmbedPlugin } from './plugins/oembed-plugin';
export { createCardPlugin } from './plugins/card-plugin';
export { createMermaidPlugin } from './plugins/mermaid-plugin';

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
