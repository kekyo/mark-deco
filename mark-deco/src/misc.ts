// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import { OEmbedProvider } from './plugins/oembed/types';
import downloadedProvidersJson from './plugins/oembed/providers.json' with { type: 'json' };

// Misc exports
export { amazonRules } from './plugins/card/amazon-rules';

/**
 * Default providers from downloaded providers.json
 * Downloaded from https://oembed.com/providers.json
 *
 * Export this if you want to use the built-in provider list,
 * or provide your own custom providers to buildProvidersCache.
 */
export const defaultProviderList: OEmbedProvider[] =
  downloadedProvidersJson as OEmbedProvider[];
