import {
  createMarkdownProcessor,
  createOEmbedPlugin,
  createCardPlugin,
  createMermaidPlugin,
  createCachedFetcher,
  createMemoryCacheStorage,
  getConsoleLogger,
  defaultProviderList,
} from 'mark-deco';
import type { Config } from './config.js';

// Import the MarkdownProcessor type - this should be available from mark-deco package
type MarkdownProcessor = ReturnType<typeof createMarkdownProcessor>;

/**
 * Setup markdown processor with plugins based on configuration
 */
export function setupProcessor(config: Config): MarkdownProcessor {
  const plugins = [];
  const logger = getConsoleLogger();
  const fetcher = createCachedFetcher(
    'mark-deco-cli/0.0.1',
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
}
