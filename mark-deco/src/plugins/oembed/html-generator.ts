import {
  createResponsiveImageWithContainer,
  createResponsiveImageTag,
} from '../../utils/responsive-image.js';
import {
  escapeHtml,
  calculateAspectRatio,
  extractAspectRatioFromHtml,
} from './utils.js';
import type { OEmbedResponse, OEmbedPluginOptions } from './types.js';

/**
 * Generate fallback HTML for unsupported providers
 */
export const generateFallbackHtml = (
  url: string,
  errorInfo?: string
): string => {
  const urlObj = new URL(url);
  const domain = urlObj.hostname.replace(/^www\./, '');

  const errorIndicator = errorInfo ? ` (Failed by ${errorInfo})` : '';

  return `<div class="oembed-container oembed-fallback">
  <div class="oembed-header">
    <div class="oembed-title">External Content</div>
    <div class="oembed-provider">${escapeHtml(domain)}${errorIndicator}</div>
  </div>
  <div class="oembed-content">
    <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
      View content on ${escapeHtml(domain)}
    </a>
  </div>
</div>`;
};

/**
 * Generate HTML from oEmbed response data
 */
export const generateHtml = (
  data: OEmbedResponse,
  originalUrl: string,
  options: OEmbedPluginOptions = {}
): string => {
  // Default display fields with default order when displayFields is undefined
  const defaultDisplayFields = {
    title: 1,
    author: 2,
    provider: 3,
    description: 4,
    thumbnail: 5,
    embeddedContent: 6,
    externalLink: 7,
  };

  // If displayFields is undefined, use default display fields, otherwise use provided displayFields
  const displayFields =
    options.displayFields === undefined
      ? defaultDisplayFields
      : options.displayFields;

  const urlObj = new URL(originalUrl);
  const domain = urlObj.hostname.replace(/^www\./, '');

  switch (data.type) {
    case 'photo':
      return generatePhotoHtml(
        data,
        originalUrl,
        domain,
        displayFields,
        options
      );
    case 'video':
    case 'rich':
      return generateVideoRichHtml(
        data,
        originalUrl,
        domain,
        displayFields,
        options
      );
    case 'link':
      return generateLinkHtml(
        data,
        originalUrl,
        domain,
        displayFields,
        options
      );
    default:
      return generateFallbackHtml(originalUrl, undefined);
  }
};

/**
 * Generate HTML for photo type oEmbed response
 */
const generatePhotoHtml = (
  data: OEmbedResponse,
  originalUrl: string,
  domain: string,
  displayFields: NonNullable<OEmbedPluginOptions['displayFields']>,
  options: OEmbedPluginOptions
): string => {
  const title = data.title || 'Untitled';
  const authorName = data.author_name || 'Unknown';
  const imageUrl = data.url || '';
  const width = data.width || 0;
  const height = data.height || 0;

  let sizeAttrs = '';
  if (width > 0 && height > 0) {
    sizeAttrs = ` width="${width}" height="${height}"`;
  }

  // Prepare all field items for sorting by display order
  interface DisplayItem {
    order: number;
    html: string;
  }

  const allItems: DisplayItem[] = [];

  // Add all fields based on display order
  if (displayFields.title !== undefined) {
    allItems.push({
      order: displayFields.title,
      html: `<div class="oembed-title">${escapeHtml(title)}</div>`,
    });
  }
  if (displayFields.author !== undefined) {
    allItems.push({
      order: displayFields.author,
      html: `<div class="oembed-author">by ${escapeHtml(authorName)}</div>`,
    });
  }
  if (displayFields.provider !== undefined) {
    allItems.push({
      order: displayFields.provider,
      html: `<div class="oembed-provider">${escapeHtml(domain)}</div>`,
    });
  }
  if (displayFields.description !== undefined && data.author_name) {
    allItems.push({
      order: displayFields.description,
      html: `<div class="oembed-description">${escapeHtml(data.author_name)}</div>`,
    });
  }
  if (displayFields.thumbnail !== undefined && data.thumbnail_url) {
    allItems.push({
      order: displayFields.thumbnail,
      html: createResponsiveImageWithContainer(
        escapeHtml(data.thumbnail_url),
        escapeHtml(title),
        'oembed-thumbnail'
      ),
    });
  }
  if (displayFields.embeddedContent !== undefined && imageUrl) {
    const additionalAttrs = sizeAttrs ? sizeAttrs.trim() : '';
    allItems.push({
      order: displayFields.embeddedContent,
      html: createResponsiveImageTag(
        escapeHtml(imageUrl),
        escapeHtml(title),
        undefined,
        additionalAttrs
      ),
    });
  }
  if (displayFields.externalLink !== undefined) {
    const linkUrl = options.useMetadataUrlLink
      ? data.web_page || originalUrl
      : originalUrl;
    allItems.push({
      order: displayFields.externalLink,
      html: `<div class="oembed-external-link">
      <a href="${escapeHtml(linkUrl)}" target="_blank" rel="noopener noreferrer">
        Visit ${escapeHtml(domain)}
      </a>
    </div>`,
    });
  }

  // Sort by display order and generate unified HTML
  const sortedItems = allItems.sort((a, b) => a.order - b.order);

  // Group items into header and content sections based on their type
  const headerItems: string[] = [];
  const contentItems: string[] = [];

  sortedItems.forEach((item) => {
    // Determine if this is a header or content item based on CSS class
    if (
      item.html.includes('oembed-title') ||
      item.html.includes('oembed-author') ||
      item.html.includes('oembed-provider') ||
      item.html.includes('oembed-description')
    ) {
      headerItems.push(item.html);
    } else {
      contentItems.push(item.html);
    }
  });

  let headerHtml = '';
  if (headerItems.length > 0) {
    headerHtml = `<div class="oembed-header">${headerItems.join('')}</div>`;
  }

  let contentHtml = '';
  if (contentItems.length > 0) {
    contentHtml = `<div class="oembed-content">
    ${contentItems.join('')}
  </div>`;
  }

  return `<div class="oembed-container oembed-photo">
  ${headerHtml}
  ${contentHtml}
</div>`;
};

/**
 * Generate HTML for video/rich type oEmbed response
 */
const generateVideoRichHtml = (
  data: OEmbedResponse,
  originalUrl: string,
  domain: string,
  displayFields: NonNullable<OEmbedPluginOptions['displayFields']>,
  options: OEmbedPluginOptions
): string => {
  const title = data.title || 'Untitled';
  const authorName = data.author_name || 'Unknown';
  const html = data.html || '';

  // Make content responsive if HTML contains iframe
  const processedHtml = shouldMakeResponsive(html)
    ? makeContentResponsive(html, data)
    : html;

  // Prepare all field items for sorting by display order
  interface DisplayItem {
    order: number;
    html: string;
  }

  const allItems: DisplayItem[] = [];

  // Add all fields based on display order
  if (displayFields.title !== undefined) {
    allItems.push({
      order: displayFields.title,
      html: `<div class="oembed-title">${escapeHtml(title)}</div>`,
    });
  }
  if (displayFields.author !== undefined) {
    allItems.push({
      order: displayFields.author,
      html: `<div class="oembed-author">by ${escapeHtml(authorName)}</div>`,
    });
  }
  if (displayFields.provider !== undefined) {
    allItems.push({
      order: displayFields.provider,
      html: `<div class="oembed-provider">${escapeHtml(domain)}</div>`,
    });
  }
  if (displayFields.description !== undefined && data.author_name) {
    allItems.push({
      order: displayFields.description,
      html: `<div class="oembed-description">${escapeHtml(data.author_name)}</div>`,
    });
  }
  if (displayFields.thumbnail !== undefined && data.thumbnail_url) {
    allItems.push({
      order: displayFields.thumbnail,
      html: createResponsiveImageWithContainer(
        escapeHtml(data.thumbnail_url),
        escapeHtml(title),
        'oembed-thumbnail'
      ),
    });
  }
  if (displayFields.embeddedContent !== undefined && processedHtml) {
    allItems.push({
      order: displayFields.embeddedContent,
      html: processedHtml,
    });
  }
  if (displayFields.externalLink !== undefined) {
    const linkUrl = options.useMetadataUrlLink
      ? data.web_page || originalUrl
      : originalUrl;
    allItems.push({
      order: displayFields.externalLink,
      html: `<div class="oembed-external-link">
      <a href="${escapeHtml(linkUrl)}" target="_blank" rel="noopener noreferrer">
        Visit ${escapeHtml(domain)}
      </a>
    </div>`,
    });
  }

  // Sort by display order and generate unified HTML
  const sortedItems = allItems.sort((a, b) => a.order - b.order);

  // Group items into header and content sections based on their type
  const headerItems: string[] = [];
  const contentItems: string[] = [];

  sortedItems.forEach((item) => {
    // Determine if this is a header or content item based on CSS class
    if (
      item.html.includes('oembed-title') ||
      item.html.includes('oembed-author') ||
      item.html.includes('oembed-provider') ||
      item.html.includes('oembed-description')
    ) {
      headerItems.push(item.html);
    } else {
      contentItems.push(item.html);
    }
  });

  let headerHtml = '';
  if (headerItems.length > 0) {
    headerHtml = `<div class="oembed-header">${headerItems.join('')}</div>`;
  }

  let contentHtml = '';
  if (contentItems.length > 0) {
    contentHtml = `<div class="oembed-content">
    ${contentItems.join('')}
  </div>`;
  }

  return `<div class="oembed-container oembed-video">
  ${headerHtml}
  ${contentHtml}
</div>`;
};

/**
 * Generate HTML for link type oEmbed response
 */
const generateLinkHtml = (
  data: OEmbedResponse,
  originalUrl: string,
  domain: string,
  displayFields: NonNullable<OEmbedPluginOptions['displayFields']>,
  options: OEmbedPluginOptions
): string => {
  const title = data.title || 'Link';
  const description = data.author_name || '';
  const thumbnailUrl = data.thumbnail_url || '';

  // Prepare all field items for sorting by display order
  interface DisplayItem {
    order: number;
    html: string;
  }

  const allItems: DisplayItem[] = [];

  // Add all fields based on display order
  if (displayFields.title !== undefined) {
    allItems.push({
      order: displayFields.title,
      html: `<div class="oembed-title">${escapeHtml(title)}</div>`,
    });
  }
  if (displayFields.author !== undefined) {
    allItems.push({
      order: displayFields.author,
      html: `<div class="oembed-author">by ${escapeHtml(data.author_name || 'Unknown')}</div>`,
    });
  }
  if (displayFields.provider !== undefined) {
    allItems.push({
      order: displayFields.provider,
      html: `<div class="oembed-provider">${escapeHtml(domain)}</div>`,
    });
  }
  if (displayFields.description !== undefined && description) {
    allItems.push({
      order: displayFields.description,
      html: `<div class="oembed-description">${escapeHtml(description)}</div>`,
    });
  }
  if (displayFields.thumbnail !== undefined && thumbnailUrl) {
    allItems.push({
      order: displayFields.thumbnail,
      html: createResponsiveImageWithContainer(
        escapeHtml(thumbnailUrl),
        escapeHtml(title),
        'oembed-thumbnail'
      ),
    });
  }
  if (displayFields.embeddedContent !== undefined && data.html) {
    allItems.push({
      order: displayFields.embeddedContent,
      html: data.html,
    });
  }
  if (displayFields.externalLink !== undefined) {
    const linkUrl = options.useMetadataUrlLink
      ? data.web_page || originalUrl
      : originalUrl;
    allItems.push({
      order: displayFields.externalLink,
      html: `<a href="${escapeHtml(linkUrl)}" target="_blank" rel="noopener noreferrer">
      Visit ${escapeHtml(domain)}
    </a>`,
    });
  }

  // Sort by display order and generate unified HTML
  const sortedItems = allItems.sort((a, b) => a.order - b.order);

  // Group items into header and content sections based on their type
  const headerItems: string[] = [];
  const contentItems: string[] = [];

  sortedItems.forEach((item) => {
    // Determine if this is a header or content item based on CSS class
    if (
      item.html.includes('oembed-title') ||
      item.html.includes('oembed-author') ||
      item.html.includes('oembed-provider') ||
      item.html.includes('oembed-description')
    ) {
      headerItems.push(item.html);
    } else {
      contentItems.push(item.html);
    }
  });

  let headerHtml = '';
  if (headerItems.length > 0) {
    headerHtml = `<div class="oembed-header">${headerItems.join('')}</div>`;
  }

  let contentHtml = '';
  if (contentItems.length > 0) {
    contentHtml = `<div class="oembed-content">${contentItems.join('')}</div>`;
  }

  return `<div class="oembed-container oembed-link">
  ${headerHtml}
  ${contentHtml}
</div>`;
};

/**
 * Make content responsive
 */
const makeContentResponsive = (
  html: string,
  oembedData?: OEmbedResponse
): string => {
  if (!html) return html;

  // Determine aspect ratio (in priority order)
  let aspectRatio: number | null = null;

  // 1. Calculate from oEmbed data width/height
  if (oembedData) {
    aspectRatio = calculateAspectRatio(oembedData.width, oembedData.height);
  }

  // 2. Extract from HTML iframe attributes
  if (!aspectRatio) {
    aspectRatio = extractAspectRatioFromHtml(html);
  }

  // 3. Final fallback (16:9)
  if (!aspectRatio) {
    aspectRatio = 56.25; // 16:9
  }

  return wrapWithResponsiveContainer(html, aspectRatio);
};

/**
 * Check if content should be made responsive
 */
const shouldMakeResponsive = (html: string): boolean => {
  return !!html && /<iframe/i.test(html);
};

/**
 * Generate responsive iframe CSS styles
 */
const generateResponsiveIframeStyles = (): string => {
  return `
    <style>
      .oembed-responsive-wrapper {
        position: relative;
        width: 100%;
        height: 0;
        overflow: hidden;
      }
      .oembed-iframe-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      }
      .oembed-iframe-container iframe {
        width: 100% !important;
        height: 100% !important;
        border: none !important;
      }
    </style>
  `;
};

/**
 * Wrap content with responsive container
 */
const wrapWithResponsiveContainer = (
  html: string,
  aspectRatio: number
): string => {
  const hasIframe = /<iframe/i.test(html);

  if (hasIframe) {
    // Complete responsive container with CSS styles
    const styles = generateResponsiveIframeStyles();
    const wrapperStyle = `padding-bottom: ${aspectRatio}%;`;

    return `${styles}<div class="oembed-responsive-wrapper" style="${wrapperStyle}"><div class="oembed-iframe-container">${html}</div></div>`;
  } else {
    // Basic responsive container for non-iframe content
    return `<div class="oembed-responsive-content">${html}</div>`;
  }
};
