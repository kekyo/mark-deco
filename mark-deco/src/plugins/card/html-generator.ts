// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import {
  createResponsiveImageWithContainer,
  createResponsiveImageTag,
} from '../../utils/responsive-image';
import { escapeHtml, truncateText, cleanText, extractDomain } from './utils';
import type { ExtractedMetadata, CardPluginOptions } from './types';

/**
 * Generate fallback HTML for when OGP data cannot be fetched
 */
export const generateFallbackHtml = (
  url: string,
  errorInfo?: string
): string => {
  const domain = extractDomain(url);

  // Determine error message based on error type
  let errorMessage = 'Content not accessible';
  let hint = '';

  if (errorInfo) {
    if (
      errorInfo.includes('CORS') ||
      errorInfo.includes('NetworkError') ||
      errorInfo.includes('TypeError')
    ) {
      errorMessage = 'CORS restriction';
      hint = 'This site blocks cross-origin requests in browsers';
    } else if (errorInfo.includes('Timeout')) {
      errorMessage = 'Request timeout';
      hint = 'The site took too long to respond';
    } else {
      errorMessage = 'Access failed';
      hint = errorInfo;
    }
  }

  return `<div class="card-container card-fallback">
  <div class="card-body">
    <div class="card-header">
      <div class="card-title">📄 External Content</div>
      <div class="card-provider">${escapeHtml(domain)}</div>
    </div>
    <div class="card-description">
      ${errorMessage}${hint ? ` - ${hint}` : ''}
    </div>
    <div class="card-content">
      <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="card-external-link">
        → Open ${escapeHtml(domain)} in new tab
      </a>
    </div>
  </div>
</div>`;
};

/**
 * Generate HTML card from extracted metadata
 */
export const generateCardHtml = (
  data: ExtractedMetadata,
  originalUrl: string,
  options: CardPluginOptions = {}
): string => {
  // Default display fields with default order when displayFields is undefined
  const defaultDisplayFields: Record<string, number> = {
    title: 1,
    image: 2,
    description: 3,
    siteName: 4,
    favicon: 5,
    url: 6,
    // Enhanced fields for common scenarios
    price: 10,
    rating: 11,
    brand: 12,
    features: 13,
  };

  // Use provided displayFields or defaults
  const displayFields = options.displayFields || defaultDisplayFields;

  // Helper function to safely get string value from metadata
  const getString = (key: string): string | undefined => {
    const value = data[key];
    return typeof value === 'string' ? value : undefined;
  };

  // Extract basic metadata
  const title = cleanText(getString('title') || 'Untitled');
  const description = getString('description') || '';
  const imageUrl = getString('image') || '';
  const faviconUrl = getString('favicon');

  // Determine which URL to use based on useMetadataUrlLink option
  const url = options.useMetadataUrlLink
    ? getString('url') || originalUrl
    : originalUrl;
  const siteName = getString('siteName') || extractDomain(url);

  // Truncate text for better display
  const truncatedTitle = truncateText(title, 80);
  const truncatedDescription = truncateText(cleanText(description), 160);

  // Prepare field items for sorting by display order
  interface DisplayItem {
    order: number;
    html: string;
    isHeader?: boolean;
    section: 'image' | 'header' | 'body' | 'enhanced';
  }

  const allItems: DisplayItem[] = [];

  // Generate image section
  if (imageUrl && displayFields.image !== undefined) {
    allItems.push({
      order: displayFields.image,
      section: 'image',
      html: createResponsiveImageWithContainer(
        escapeHtml(imageUrl),
        escapeHtml(truncatedTitle),
        'card-image',
        undefined,
        'loading="lazy"'
      ),
    });
  }

  // Generate favicon if available
  let faviconHtml = '';
  if (faviconUrl && displayFields.favicon !== undefined) {
    faviconHtml = createResponsiveImageTag(
      escapeHtml(faviconUrl),
      '',
      undefined,
      'class="card-favicon"'
    );
  }

  // Generate header items
  const headerItems: DisplayItem[] = [];

  if (displayFields.title !== undefined) {
    headerItems.push({
      order: displayFields.title,
      section: 'header',
      isHeader: true,
      html: `<div class="card-title">${escapeHtml(truncatedTitle)}</div>`,
    });
  }

  if (displayFields.siteName !== undefined) {
    headerItems.push({
      order: displayFields.siteName,
      section: 'header',
      isHeader: true,
      html: `<div class="card-provider">
          ${displayFields.favicon !== undefined ? faviconHtml : ''}
          <span>${escapeHtml(siteName)}</span>
        </div>`,
    });
  }

  // Generate body items
  if (truncatedDescription && displayFields.description !== undefined) {
    allItems.push({
      order: displayFields.description,
      section: 'body',
      html: `<div class="card-description">${escapeHtml(truncatedDescription)}</div>`,
    });
  }

  // Generate enhanced fields from metadata
  for (const [fieldName, value] of Object.entries(data)) {
    // Skip basic fields that are handled separately
    if (
      [
        'title',
        'description',
        'image',
        'url',
        'siteName',
        'type',
        'locale',
        'favicon',
      ].includes(fieldName)
    ) {
      continue;
    }

    const order = displayFields[fieldName];
    if (order !== undefined) {
      let fieldHtml = '';

      if (Array.isArray(value)) {
        // Handle array values (e.g., features)
        const items = value
          .slice(0, 3)
          .map((item) => `<li>${escapeHtml(String(item))}</li>`)
          .join('');
        fieldHtml = `<div class="card-field card-${fieldName}">
          <div class="field-label">${escapeHtml(fieldName)}:</div>
          <ul class="field-list">${items}</ul>
        </div>`;
      } else {
        // Handle single values
        fieldHtml = `<div class="card-field card-${fieldName}">
          <span class="field-label">${escapeHtml(fieldName)}:</span>
          <span class="field-value">${escapeHtml(String(value))}</span>
        </div>`;
      }

      allItems.push({
        order,
        section: 'enhanced',
        html: fieldHtml,
      });
    }
  }

  // Also add any undefined fields at the end
  const undefinedFields: string[] = [];
  for (const fieldName of Object.keys(data)) {
    // Skip basic fields and already processed fields
    if (
      [
        'title',
        'description',
        'image',
        'url',
        'siteName',
        'type',
        'locale',
        'favicon',
      ].includes(fieldName)
    ) {
      continue;
    }

    if (displayFields[fieldName] === undefined) {
      undefinedFields.push(fieldName);
    }
  }

  // Add undefined fields with high order values
  let undefinedOrder = 1000;
  for (const fieldName of undefinedFields) {
    const value = data[fieldName];
    let fieldHtml = '';

    if (Array.isArray(value)) {
      const items = value
        .slice(0, 3)
        .map((item) => `<li>${escapeHtml(String(item))}</li>`)
        .join('');
      fieldHtml = `<div class="card-field card-${fieldName}">
        <div class="field-label">${escapeHtml(fieldName)}:</div>
        <ul class="field-list">${items}</ul>
      </div>`;
    } else {
      fieldHtml = `<div class="card-field card-${fieldName}">
        <span class="field-label">${escapeHtml(fieldName)}:</span>
        <span class="field-value">${escapeHtml(String(value))}</span>
      </div>`;
    }

    allItems.push({
      order: undefinedOrder++,
      section: 'enhanced',
      html: fieldHtml,
    });
  }

  // Sort header items by order
  const sortedHeaderItems = headerItems.sort((a, b) => a.order - b.order);

  // Generate header HTML
  let headerHtml = '';
  if (sortedHeaderItems.length > 0) {
    headerHtml = `<div class="card-header">
        ${sortedHeaderItems.map((item) => item.html).join('')}
      </div>`;
  }

  // Sort non-header items by order
  const sortedBodyItems = allItems
    .filter((item) => !item.isHeader)
    .sort((a, b) => a.order - b.order);

  // Group items by section for proper HTML structure
  const imageItems = sortedBodyItems.filter((item) => item.section === 'image');
  const bodyItems = sortedBodyItems.filter(
    (item) => item.section === 'body' || item.section === 'enhanced'
  );

  // Generate image section HTML
  const imageHtml = imageItems.map((item) => item.html).join('');

  // Generate body content HTML
  let bodyContentHtml = '';
  if (bodyItems.length > 0) {
    bodyContentHtml = bodyItems.map((item) => item.html).join('');
  }

  // Combine header and body content
  const bodyHtml =
    headerHtml || bodyContentHtml
      ? `<div class="card-body">
      ${headerHtml}
      ${bodyContentHtml}
    </div>`
      : '';

  // Add class modifier for Amazon products
  const isAmazon = getString('siteName')?.toLowerCase().includes('amazon');
  const containerClass = isAmazon
    ? 'card-container card-amazon'
    : 'card-container';

  // Generate the card HTML conditionally
  const cardContent =
    displayFields.url !== undefined
      ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="card-link">
    ${imageHtml}
    ${bodyHtml}
  </a>`
      : `${imageHtml}
    ${bodyHtml}`;

  return `<div class="${containerClass}">
  ${cardContent}
</div>`;
};
