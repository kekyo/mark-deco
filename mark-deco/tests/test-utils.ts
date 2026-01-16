// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import {
  generateHtml,
  generateFallbackHtml,
  isValidUrl,
} from '../src/internal';
import type { OEmbedResponse } from '../src/internal';
import type {
  MarkdownProcessorPlugin,
  MarkdownProcessorPluginContext,
} from '../src/types';

/**
 * Create a mock plugin for testing purposes
 */
export const createMockPlugin = (name: string): MarkdownProcessorPlugin => {
  const processBlock = async (
    content: string,
    _context: MarkdownProcessorPluginContext
  ): Promise<string> => {
    return `<div class="mock-plugin" data-plugin="${name}">Mock plugin processed: ${content}</div>`;
  };

  return {
    name,
    processBlock,
  };
};

/**
 * Create a mock oEmbed plugin for testing purposes
 */
export const createMockOEmbedPlugin = (
  options: Record<string, unknown> = {}
): MarkdownProcessorPlugin => {
  const processBlock = async (content: string): Promise<string> => {
    const url = content.trim();

    if (!isValidUrl(url)) {
      throw new Error(`Invalid URL: ${url}`);
    }

    const mockData = getMockOEmbedData(url);
    if (mockData) {
      return generateHtml(mockData, url, options);
    }

    // Return fallback HTML for unsupported providers
    return generateFallbackHtml(url, undefined);
  };

  return {
    name: 'oembed',
    processBlock,
  };
};

/**
 * Get mock oEmbed data for testing
 */
const getMockOEmbedData = (url: string): OEmbedResponse | null => {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname.replace(/^www\./, '');

  // YouTube mock data
  if (hostname === 'youtu.be' || hostname === 'youtube.com') {
    return {
      type: 'video',
      version: '1.0',
      title: 'Peru 8K HDR 60FPS (FUHD)',
      author_name: 'Jacob + Katie Schwarz',
      author_url: 'https://www.youtube.com/channel/UCsEXB99-jskqXX_dHQ6_-1w',
      provider_name: 'YouTube',
      provider_url: 'https://www.youtube.com/',
      html: '<iframe width="560" height="315" src="https://www.youtube.com/embed/1La4QzGeaaQ" frameborder="0" allowfullscreen></iframe>',
      width: 560,
      height: 315,
      thumbnail_url: 'https://i.ytimg.com/vi/1La4QzGeaaQ/hqdefault.jpg',
      thumbnail_width: 480,
      thumbnail_height: 360,
      web_page: 'https://example.com/web-page',
    };
  }

  // Vimeo mock data (4:3 aspect ratio for testing)
  if (hostname === 'vimeo.com') {
    return {
      type: 'video',
      version: '1.0',
      title: 'Test Video 4:3',
      author_name: 'Test Author',
      author_url: 'https://vimeo.com/testauthor',
      provider_name: 'Vimeo',
      provider_url: 'https://vimeo.com/',
      html: '<iframe width="640" height="480" src="https://player.vimeo.com/video/123456789" frameborder="0" allowfullscreen></iframe>',
      width: 640,
      height: 480,
      thumbnail_url: 'https://i.vimeocdn.com/video/123456789_640.jpg',
      thumbnail_width: 640,
      thumbnail_height: 480,
      web_page: 'https://example.com/web-page',
    };
  }

  // Flickr mock data
  if (hostname === 'flickr.com') {
    return {
      type: 'photo',
      version: '1.0',
      title: 'Bacon Lollys',
      author_name: 'bees',
      author_url: 'https://www.flickr.com/photos/bees/',
      provider_name: 'Flickr',
      provider_url: 'https://www.flickr.com/',
      url: 'https://live.staticflickr.com/3123/2362225867_954a758394_b.jpg',
      width: 1024,
      height: 768,
      web_page: 'https://www.flickr.com/photos/bees/2362225867/',
    };
  }

  return null;
};
