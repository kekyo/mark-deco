// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

/**
 * oEmbed response interface
 */
export interface OEmbedResponse {
  /** The resource type */
  type: 'photo' | 'video' | 'link' | 'rich';
  /** The oEmbed version number */
  version: string;
  /** A text title, describing the resource */
  title?: string;
  /** The name of the author/owner of the resource */
  author_name?: string;
  /** A URL for the author/owner of the resource */
  author_url?: string;
  /** The name of the resource provider */
  provider_name?: string;
  /** The url of the resource provider */
  provider_url?: string;
  /** The suggested cache lifetime for this resource, in seconds */
  cache_age?: number;
  /** A URL to a thumbnail image representing the resource */
  thumbnail_url?: string;
  /** The width of the optional thumbnail */
  thumbnail_width?: number;
  /** The height of the optional thumbnail */
  thumbnail_height?: number;

  // Photo type specific
  /** The source URL of the image (photo type only) */
  url?: string;
  /** The width in pixels of the image (photo type only) */
  width?: number;
  /** The height in pixels of the image (photo type only) */
  height?: number;

  // Video/rich type specific
  /** The HTML required to embed a video player (video/rich type only) */
  html?: string;

  // Additional fields
  /** The web page URL for the resource */
  web_page?: string;
}

/**
 * oEmbed provider endpoint interface
 */
export interface OEmbedEndpoint {
  url: string;
  schemes?: string[];
  discovery?: boolean;
  formats?: string[];
}

/**
 * oEmbed provider interface from providers.json
 */
export interface OEmbedProvider {
  provider_name: string;
  provider_url: string;
  endpoints: OEmbedEndpoint[];
}

/**
 * oEmbed plugin display fields interface
 */
export interface OEmbedPluginDisplayFields {
  /** Display order for the title (default: undefined - not displayed, number: display order) */
  title?: number;
  /** Display order for the thumbnail image (default: undefined - not displayed, number: display order) */
  thumbnail?: number;
  /** Display order for the author information (default: undefined - not displayed, number: display order) */
  author?: number;
  /** Display order for the provider information (default: undefined - not displayed, number: display order) */
  provider?: number;
  /** Display order for the description (default: undefined - not displayed, number: display order) */
  description?: number;
  /** Display order for the embedded content (video/rich HTML) (default: undefined - not displayed, number: display order) */
  embeddedContent?: number;
  /** Display order for the external link to the source (default: undefined - not displayed, number: display order) */
  externalLink?: number;
}

/**
 * oEmbed plugin options
 */
export interface OEmbedPluginOptions {
  /** Maximum number of redirects to follow */
  maxRedirects?: number;
  /** Timeout for each redirect request in milliseconds */
  timeoutEachRedirect?: number;
  /** Whether to use metadata URL (from oEmbed response) for links instead of provided URL (default: false) */
  useMetadataUrlLink?: boolean;
  /** Control which metadata fields to display in the generated HTML */
  displayFields?: OEmbedPluginDisplayFields;
}
