// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import {
  createMarkdownProcessor,
  createOEmbedPlugin,
  createCardPlugin,
  createMermaidPlugin,
  createCachedFetcher,
  createMemoryCacheStorage,
  getConsoleLogger,
} from 'mark-deco';
import { defaultProviderList } from 'mark-deco/misc';
import type { Config } from './config';

// Import the MarkdownProcessor type - this should be available from mark-deco package
type MarkdownProcessor = ReturnType<typeof createMarkdownProcessor>;

/**
 * Setup markdown processor with plugins based on configuration
 */
export const setupProcessor = (config: Config): MarkdownProcessor => {
  const plugins = [];
  const logger = getConsoleLogger();
  const fetcher = createCachedFetcher(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.0.0 Safari/537.36',
    5000,
    createMemoryCacheStorage()
  );

  // Determine which plugins to enable
  const enabledPlugins = config.noPlugins
    ? []
    : Array.isArray(config.plugins)
      ? config.plugins
      : ['oembed', 'card', 'mermaid'];

  // Add oEmbed plugin
  if (enabledPlugins.includes('oembed') && config.oembed?.enabled !== false) {
    plugins.push(createOEmbedPlugin(defaultProviderList, {}));
  }

  // Add card plugin
  if (enabledPlugins.includes('card') && config.card?.enabled !== false) {
    plugins.push(createCardPlugin({}));
  }

  // Add Mermaid plugin
  if (enabledPlugins.includes('mermaid') && config.mermaid?.enabled !== false) {
    plugins.push(createMermaidPlugin({}));
  }

  // Create and return processor
  return createMarkdownProcessor({
    plugins,
    logger,
    fetcher,
  });
};
