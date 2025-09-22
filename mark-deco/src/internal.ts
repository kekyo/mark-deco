// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

// Internal APIs for testing - DO NOT USE IN PRODUCTION
// These exports are intended for internal testing only and may change without notice

// Shared utility exports
export { formatErrorInfo } from './plugins/shared/error-formatter.js';

// oEmbed related exports
export type { OEmbedResponse } from './plugins/oembed/types.js';
export {
  generateHtml,
  generateFallbackHtml,
} from './plugins/oembed/html-generator.js';
export {
  isValidUrl,
  escapeHtml,
  calculateAspectRatio,
  extractAspectRatioFromHtml,
} from './plugins/oembed/utils.js';

export { fetchOEmbedData, CORSError } from './plugins/oembed/fetcher.js';

// Card plugin related exports

export {
  generateCardHtml,
  generateFallbackHtml as generateCardFallbackHtml,
} from './plugins/card/html-generator.js';
export {
  isValidUrl as isValidCardUrl,
  escapeHtml as escapeCardHtml,
  extractDomain,
  resolveUrl,
  truncateText,
  cleanText,
  extractEnhancedData,
} from './plugins/card/utils.js';

export { fetchMetadata } from './plugins/card/fetcher.js';
