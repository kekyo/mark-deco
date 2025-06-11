# MarkDeco

A high-performance Markdown to HTML conversion library written in TypeScript.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/kekyo/mark-deco/actions/workflows/ci.yml/badge.svg)](https://github.com/kekyo/mark-deco/actions/workflows/ci.yml)

|Package|npm|
|:----|:----|
|`mark-deco`|[![npm version](https://img.shields.io/npm/v/mark-deco.svg)](https://www.npmjs.com/package/mark-deco)|
|`mark-deco-cli`|[![npm version](https://img.shields.io/npm/v/mark-deco-cli.svg)](https://www.npmjs.com/package/mark-deco-cli)|

[(日本語はこちら)](./README_ja.md)

## What is this?

A high-performance Markdown to HTML conversion library written in TypeScript.
It interprets GitHub Flavored Markdown (GFM) and outputs HTML.
Supports frontmatter parsing, heading analysis, source code formatting, oEmbed/card/Mermaid graph rendering, and custom code block processing through plugin extensions.

* Can be used to render HTML from Markdown input.
* Simple interface makes it very easy to use.
* Highly independent with minimal runtime requirements. Works in both Node.js and browser environments.
* Built-in plugins support oEmbed, cards, and Mermaid.js.

## Installation

```bash
npm install mark-deco
```

## Basic Usage

Here's the simplest usage example:

```typescript
import { createMarkdownProcessor, createCachedFetcher } from 'mark-deco';

// Create a memory-cached fetcher
const fetcher = createCachedFetcher('MyApp/1.0');

// Create MarkDeco processor
const processor = createMarkdownProcessor({
  fetcher
});

// Markdown to convert
const markdown = `---
title: Sample Article
author: John Doe
---

# Hello World

This is a test article.`;

// Render HTML from Markdown input
const result = await processor.process(
  markdown,
  "id");     // ID prefix for HTML elements (described later)

// Generated HTML
console.log(result.html);
// Extracted frontmatter information (described later)
console.log(result.frontmatter);
// Extracted heading information (described later)
console.log(result.headingTree);
```

This will render HTML like this:

```html
<h1 id="id-1">Hello World</h1>
<p>This is a test article.</p>
```

A "fetcher" is an abstraction for external server access. It's primarily used by oEmbed and card plugins for external API calls and page scraping. See details below.
The argument passed to the fetcher is a user agent string, which is applied to HTTP request headers when accessing external servers.

HTML converted by the MarkDeco processor is formatted in a readable manner. Advanced options allow fine-tuning of formatting conditions (described later).

### Aborting Processor Operations

While the MarkDeco processor engine itself doesn't access external servers, plugins may access external servers as needed (e.g., when using oEmbed APIs or performing page scraping).

To enable operation cancellation in such cases, pass an ECMAScript standard `AbortSignal` instance to notify cancellation signals:

```typescript
// Abort controller
const abortController = new AbortController();

// ...

// Convert Markdown to HTML
const result = await processor.process(
  markdown, "id",
  { // Specify processor options
    signal: abortController.signal,   // Cancellation support
  });
```

For usage of `AbortController` and `AbortSignal`, refer to ECMAScript documentation.

----

## Frontmatter Information Extraction

MarkDeco automatically parses "YAML frontmatter" at the beginning of Markdown files and provides it as processing results. Frontmatter is used to describe article metadata (title, author, tags, publication date, etc.).

```typescript
const markdown = `---
title: "Sample Article"
author: "John Doe"
date: "2024-01-15"
tags:
  - markdown
  - processor
published: true
---

# Article Content

This article discusses...`;

const result = await processor.process(markdown, "id");

// Access frontmatter data
console.log(result.frontmatter.title);     // "Sample Article"
console.log(result.frontmatter.author);    // "John Doe"
console.log(result.frontmatter.date);      // Date object: 2024-01-15T00:00:00.000Z
console.log(result.frontmatter.tags);      // ["markdown", "processor"]
console.log(result.frontmatter.published); // true

// Generated HTML doesn't include frontmatter
console.log(result.html); // "<h1 id="id-1">Article Content</h1>..."
```

Frontmatter data can be utilized for:

* Blog article metadata management
* Template engine integration
* Article search and filtering
* SEO information extraction
* Custom rendering logic control

Note: The MarkDeco processor itself doesn't use frontmatter information. Plugins may use this information depending on their implementation.

## Heading ID Generation and Heading Information Extraction

The processor automatically generates unique IDs for all headings (H1-H6) in the document. These IDs can be used for anchor links and navigation. ID generation supports two modes and includes advanced processing for non-ASCII characters.

IDs are embedded in HTML and also exposed through the `headingTree` property of processing results. This information can be used for table of contents generation, document structure analysis, etc:

```typescript
const markdown = `# Introduction

This is the introduction section.

# Usage

Explains basic usage.

## Subsection

This is an H2 heading subsection.

# Conclusion

This is the conclusion section.`;

const result = await processor.process(markdown, "id");

// Output heading information (described later)
console.log(result.headingTree);
```

Example HTML generated by the above code (hierarchical heading IDs enabled by default):

```html
<h1 id="id-1">Introduction</h1>
<p>This is the introduction section.</p>
<h1 id="id-2">Usage</h1>
<p>Explains basic usage.</p>
<h2 id="id-2-1">Subsection</h2>
<p>This is an H2 heading subsection.</p>
<h1 id="id-3">Conclusion</h1>
<p>This is the conclusion section.</p>
```

### Hierarchical Heading IDs

There's a feature to generate IDs that reflect heading hierarchy. When the `useHierarchicalHeadingId` option is `true`, hierarchical numbers based on heading levels are assigned.

This feature generates heading IDs in the following format:

| Heading Level | ID Format | Example |
|------------|--------|-----|
| H1 | `id-N` | `id-1`, `id-2`, `id-3` |
| H2 | `id-N-M` | `id-1-1`, `id-1-2`, `id-2-1` |
| H3 | `id-N-M-L` | `id-1-1-1`, `id-1-1-2`, `id-1-2-1` |

This makes heading structure clear and useful for navigation and table of contents generation.

When `useHierarchicalHeadingId` is set to `false`, ID numbers are assigned sequentially rather than hierarchically:

```typescript
const result = await processor.process(
  markdown, "id", {
    // Disable hierarchical heading IDs
    useHierarchicalHeadingId: false
  });
```

Example heading ID generation with sequential numbering:

| Heading Level | ID Format | Example |
|------------|--------|-----|
| All headings | `id-N` | `id-1`, `id-2`, `id-3`, `id-4`, `id-5` |

Note: In sequential mode, all headings in the document are assigned numbers sequentially regardless of heading level.

### Custom ID Prefix

You can customize the prefix used for IDs. These can be used to generate unique IDs for each tag when concatenating multiple HTML:

```typescript
// Specify ID prefix as the second argument
// Generated IDs: "id-1", "id-2", "id-3", etc.
const result = await processor.process(markdown, "id");

// Generated IDs: "section-1", "section-2", "section-3", etc.
const result = await processor.process(markdown, "section");

// Content-based IDs (<h?> tags only, described later)
const result = await processor.process(markdown, "id", {
  useContentStringHeaderId: true
});

// Example of making IDs completely unique when generating multiple HTMLs:
// "id1-1", "id1-2", "id2-1", "id2-2", "id3-1" ...
const results = await Promise.all(
  markdowns.map((markdown, index) => processor.process(markdown, `id${index}`)));
```

### Content-Based IDs

You can enable content-based IDs that generate IDs from heading text:

```typescript
// Generate human-readable IDs from heading text
const markdown = `# Hello world

## Another section

### Subsection`;

const result = await processor.process(markdown, "id", {
  useContentStringHeaderId: true
});
```

Result:

```html
<h1 id="hello-world">Hello World</h1>
<h2 id="hello-world-another-section">Another Section</h2>
<h3 id="hello-world-another-section-subsection">Subsection</h3>
```

When using content-based IDs, the processor employs sophisticated fallback strategies to handle various text inputs:

#### Step 1: Unicode Normalization and Accent Removal

Normalizes European language accents to ASCII equivalent characters:

* Input: "Café Naïve"
* Output: "cafe-naive"

* Input: "Résumé"
* Output: "resume"

#### Step 2: Control Character Processing

Converts escape sequences and control characters to hyphens:

* Input: "Section\n\nTitle"
* Output: "section-title"

* Input: "Hello\tWorld"
* Output: "hello-world"

#### Step 3: ASCII Character Extraction

Removes non-ASCII characters (Japanese, Chinese, emojis, etc.):

* Input: "Hello 世界 World"
* Output: "hello-world"

* Input: "🎉 lucky time!"
* Output: "lucky-time"

#### Step 4: Invalid ID Fallback

When the resulting ID is too short (less than 3 characters) or empty, the processor falls back to unique IDs:

* Input: "こんにちは" (Japanese only)
* Output: "id-1" (fallback)

* Input: "🎉" (emoji only)
* Output: "id-2" (fallback)

* Input: "A" (too short)
* Output: "id-3" (fallback)

### ID Generation Examples

|Input Heading|Generated ID|Processing|
|:----|:----|:----|
|`"Hello World"`|`"hello-world"`|Standard processing|
|`"Café Naïve"`|`"cafe-naive"`|Unicode normalization|
|`"Section\n\nTwo"`|`"section-two"`|Control character processing|
|`"Hello 世界"`|`"hello"`|Non-ASCII removal|
|`"こんにちは"`|`"id-1"`|Fallback (non-ASCII only)|
|`"🎉 パーティー"`|`"id-2"`|Fallback (emoji + Japanese)|
|`"A"`|`"id-3"`|Fallback (too short)|

Note: While many sites adopt such content-based IDs, MarkDeco doesn't use them by default.
The reason is that building IDs with non-English characters makes them very difficult to recognize and manage, and search systems don't particularly value them highly nowadays.

## Fetcher and Cache System

MarkDeco provides a fetcher system that uniformly manages external server access. All external server access (oEmbed API calls, page scraping, etc.) is executed through fetchers, and responses are automatically cached.

### Fetcher Types

MarkDeco provides two types of fetchers:

```typescript
import { createCachedFetcher, createDirectFetcher } from 'mark-deco';

// Cached fetcher (recommended)
const cachedFetcher = createCachedFetcher('MyApp/1.0');

// Direct fetcher (no cache)
const directFetcher = createDirectFetcher('MyApp/1.0');
```

### Cache Storage Selection

You can choose from three types of cache storage:

#### Memory Storage (Default)

```typescript
import { createCachedFetcher, createMemoryCacheStorage } from 'mark-deco';

const memoryStorage = createMemoryCacheStorage();
const fetcher = createCachedFetcher(
  'MyApp/1.0',        // User agent
  60000,              // Timeout (milliseconds)
  memoryStorage       // Cache storage
);
```

#### Local Storage (Browser Environment)

```typescript
import { createLocalCacheStorage } from 'mark-deco';

const localStorage = createLocalCacheStorage('myapp:');
const fetcher = createCachedFetcher('MyApp/1.0', 60000, localStorage);
```

#### File System Storage (Node.js Environment)

```typescript
import { createFileSystemCacheStorage } from 'mark-deco';

// Specify cache file storage location
const fileStorage = createFileSystemCacheStorage('./cache');
const fetcher = createCachedFetcher('MyApp/1.0', 60000, fileStorage);
```

### Cache Options

You can control detailed cache behavior:

```typescript
const fetcher = createCachedFetcher(
  'MyApp/1.0',
  60000,
  fileStorage, {
    cache: true,                    // Enable/disable cache
    cacheTTL: 30 * 60 * 1000,       // Cache time-to-live (30 minutes)
    cacheFailures: true,            // Cache failed requests too
    failureCacheTTL: 5 * 60 * 1000  // Failure cache time-to-live (5 minutes)
  }
);
```

Cache behavior on fetch failures:

* Success cache: Successful responses are retained until the specified TTL and aren't deleted even on failures.
* Failure cache: When `cacheFailures` is `true`, failures are also cached with a separate TTL (`failureCacheTTL`).
* Old data protection: Existing success cache isn't affected even if new requests fail.

Caching reduces duplicate requests to the same URL and improves performance.

## Built-in Plugins

MarkDeco has a plugin system. You can add the effects of these plugins during the Markdown to HTML conversion process. Here are the built-in plugins:

|Plugin Name|Details|
|:----|:----|
|`oembed`|Accesses oEmbed API from specified URLs and renders HTML with obtained metadata|
|`card`|Scrapes specified URL pages and renders HTML with obtained metadata|
|`mermaid`|Enables graph drawing with code written in `mermaid.js` graph syntax|

To use plugins, specify them as follows:

```typescript
import {
  createMarkdownProcessor, createCachedFetcher,
  createOEmbedPlugin, defaultProviderList } from 'mark-deco';

// Create fetcher
const fetcher = createCachedFetcher('MyApp/1.0');

// Generate oEmbed plugin
const oembedPlugin = createOEmbedPlugin(defaultProviderList);

const processor = createMarkdownProcessor({
  plugins: [ oembedPlugin ],   // Specify plugins to use
  fetcher                      // Specify fetcher
});

const markdown = `# Media Embedding Test

Specify YouTube video URL (short URL supported)

\`\`\`oembed
https://youtu.be/1La4QzGeaaQ
\`\`\``;

// Embed YouTube video
const result = await processor.process(markdown, "id");

// Embedded HTML is generated
console.log(result.html);
```

Plugin extensions are done through Markdown code block syntax.
Usually, code block syntax is used for syntax highlighting of program code, but when a plugin is recognized, the content of code blocks with the plugin name is processed by the plugin.

### oEmbed Plugin

"oEmbed" is an API format standard for websites to embed their URLs for display on other sites. Major platforms like YouTube and Flickr provide oEmbed APIs, allowing appropriate embedded content to be retrieved by just specifying a URL.

Using the oEmbed plugin, you can easily embed YouTube videos, Flickr photos, social media posts, etc.

```typescript
import {
  createMarkdownProcessor, createCachedFetcher,
  createOEmbedPlugin, defaultProviderList } from 'mark-deco';

// Create fetcher
const fetcher = createCachedFetcher('MyApp/1.0');

// Generate oEmbed plugin using default provider list
const oembedPlugin = createOEmbedPlugin(defaultProviderList);
const processor = createMarkdownProcessor({
  plugins: [ oembedPlugin ],
  fetcher
});

const markdown = `# Media Embedding Test

YouTube video (short URL supported)

\`\`\`oembed
https://youtu.be/1La4QzGeaaQ
\`\`\`

Flickr photo

\`\`\`oembed
https://flickr.com/photos/bees/2362225867/
\`\`\`

Short URL (automatic redirect resolution)

\`\`\`oembed
https://bit.ly/example-site-page
\`\`\``;

const result = await processor.process(markdown, "id");
```

Example generated HTML (for YouTube video):

```html
<div class="oembed-container oembed-video">
  <div class="oembed-header">
    <div class="oembed-title">Sample Video Title</div>
    <div class="oembed-author">by Channel Name</div>
    <div class="oembed-provider">from YouTube</div>
  </div>
  <div class="oembed-content">
    <iframe src="https://www.youtube.com/embed/[VIDEO_ID]" 
            frameborder="0" allowfullscreen>
            <!-- Provider-specific implementation ... -->
    </iframe>
  </div>
  <div class="oembed-footer">
    <a href="https://youtu.be/[VIDEO_ID]" target="_blank" rel="noopener noreferrer">
      Watch on YouTube
    </a>
  </div>
</div>
```

#### Supported Providers

The oEmbed plugin includes a "default provider list" published at `https://oembed.com/providers.json`. You can also specify your own list. Major providers include:

|Provider|Supported Domains|Content|
|:----|:----|:----|
|YouTube|`youtube.com`, `youtu.be`|Video embedding|
|Vimeo|`vimeo.com`|Video embedding|
|Twitter/X|`twitter.com`, `x.com`|Tweet embedding|
|Instagram|`instagram.com`|Post embedding|
|Flickr|`flickr.com`|Photo embedding|
|TikTok|`tiktok.com`|Video embedding|
|Spotify|`spotify.com`|Music/playlist embedding|
|SoundCloud|`soundcloud.com`|Audio embedding|
|Reddit|`reddit.com`|Post embedding|
|Others|Many sites|Various content embedding|

The default provider list is large. Therefore, if you want to reduce bundle size, you should prepare your own list. If you don't use `defaultProviderList`, bundlers should implicitly reduce that data.

#### Display Field Order Control

The oEmbed plugin allows fine control over displayed metadata items and their display order using the `displayFields` option:

```typescript
// Custom display order: embedded content first, then title, finally external link
const customOrderOEmbedPlugin = createOEmbedPlugin(
  defaultProviderList, {
    displayFields: {
      'embeddedContent': 1,   // Display 1st
      'title': 2,             // Display 2nd
      'externalLink': 3,      // Display 3rd
    }  // Other items won't be output
  });

// Default order when displayFields is undefined
const defaultOEmbedPlugin = createOEmbedPlugin(
  defaultProviderList, { });
```

* Numbers for each field represent display item order. They don't need to be sequential, and smaller numbers are output first.
* When `displayFields` isn't specified, all metadata items are rendered.

Available display control options:

|Field|Description|CSS Class|Default Order|
|:----|:----|:----|:----|
|`title`|Content title|`.oembed-title`|`1`|
|`author`|Author information|`.oembed-author`|`2`|
|`provider`|Provider information|`.oembed-provider`|`3`|
|`description`|Description text|`.oembed-description`|`4`|
|`thumbnail`|Thumbnail image|`.oembed-thumbnail`|`5`|
|`embeddedContent`|Embedded content (videos, etc.)|`.oembed-content`|`6`|
|`externalLink`|External link|`a[href]`|`7`|

#### Link URL Control

The oEmbed plugin allows control over URLs used for external links in generated content through the `useMetadataUrlLink` option:

```typescript
// Use URL written in Markdown
const providedLinkOEmbedPlugin = createOEmbedPlugin(
  defaultProviderList, {
    useMetadataUrlLink: false   // Use URL written in Markdown
  });

// Use canonical URL from metadata
const metadataLinkOEmbedPlugin = createOEmbedPlugin(
  defaultProviderList, {
    useMetadataUrlLink: true    // Use oEmbed metadata `web_page` URL
  });
```

Link URL selection priority:

|`useMetadataUrlLink`|URL Source Priority|Purpose|
|:----|:----|:----|
|`false`|Written URL|Preserve original URL (short links, etc.) (default)|
|`true`|oEmbed `web_page` URL --> Written URL|Use provider canonical URL|

#### Redirect Resolution

URLs specified in Markdown are automatically resolved to normalized URLs when they are short URLs or redirected URLs.
This is because oEmbed provider lists may only match normalized URLs:

```markdown
\`\`\`oembed
https://youtu.be/1La4QzGeaaQ    # --> Resolved to https://youtube.com/watch?v=1La4QzGeaaQ
\`\`\`

\`\`\`oembed
https://bit.ly/shortened-link   # --> Resolved to normalized URL
\`\`\`
```

Redirects may be executed multiple times, and provider list matching is performed for each redirect.

Note: This may not work correctly in browser environments due to CORS constraints.

#### Fallback Display

When a specified URL is from an unsupported provider, appropriate link display is generated:

```html
<div class="oembed-container oembed-fallback">
  <div class="oembed-header">
    <div class="oembed-title">External Content</div>
    <div class="oembed-provider">from example.com</div>
  </div>
  <div class="oembed-content">
    <a href="https://example.com/content" target="_blank" rel="noopener noreferrer">
      View content on example.com
    </a>
  </div>
</div>
```

#### CSS Classes

HTML generated by the oEmbed plugin includes CSS classes for styling:

|CSS Class|Applied Element|Description|
|:----|:----|:----|
|`.oembed-container`| Overall container | Container for entire oEmbed embedding |
|`.oembed-video`| Container | Additional class for video content |
|`.oembed-photo`| Container | Additional class for photo content |
|`.oembed-link`| Container | Additional class for link content |
|`.oembed-rich`| Container | Additional class for rich content |
|`.oembed-header`| Header section | Container for title/author/provider info |
|`.oembed-title`| Title element | Content title |
|`.oembed-author`| Author element | Author/channel name, etc. |
|`.oembed-provider`| Provider element | Service provider name |
|`.oembed-description`| Description element | Content description |
|`.oembed-thumbnail`| Thumbnail element | Thumbnail image |
|`.oembed-content`| Embedded element | iframe or actual content |
|`.oembed-footer`| Footer section | External links, etc. |
|`.oembed-fallback`| Fallback element | Fallback display for unsupported sites |

### Card Plugin

The card plugin scrapes specified URL pages and renders metadata groups. Even pages without oEmbed APIs can be scraped for information and displayed in a unified format.

By default, it extracts Open Graph Protocol (OGP) metadata from pages and generates designable HTML for rich preview cards. Other metadata formats can also be flexibly supported by writing extraction rules.

```typescript
import { createCardPlugin, createCachedFetcher } from 'mark-deco';

// Create fetcher
const fetcher = createCachedFetcher('MyApp/1.0');

// Generate card plugin
const cardPlugin = createCardPlugin();

const processor = createMarkdownProcessor({
  plugins: [ cardPlugin ],
  fetcher
});

const markdown = `# Product Review

## GitHub Repository
\`\`\`card
https://github.com/kekyo/async-primitives
\`\`\`

## eBay Product
\`\`\`card
https://www.ebay.com/itm/167556314958
\`\`\``;

const result = await processor.process(markdown, "id");

// Rich card HTML is generated
console.log(result.html);
```

Example generated HTML (varies depending on metadata obtained from target page):

```html
<div class="card-container">
  <a href="[URL]" target="_blank" rel="noopener noreferrer" class="card-link">
    <div class="card-image">
      <img src="[IMAGE_URL]" alt="[TITLE]" loading="lazy" />
    </div>
    <div class="card-body">
      <div class="card-header">
        <div class="card-title">[TITLE]</div>
        <div class="card-provider">
          <img src="[FAVICON]" alt="" class="card-favicon" />
          <span>[SITE_NAME]</span>
        </div>
      </div>
      <div class="card-description">[DESCRIPTION]</div>
    </div>
  </a>
</div>
```

Note: OGP is a standard specification that allows SNS and other services to uniformly obtain webpage metadata. To avoid each site describing metadata in its own way, it provides information like `title`, `description`, `image`, `site_name` in a common HTML meta tag format. This allows the card plugin to obtain metadata in a consistent format from many websites and achieve unified card display.

#### Metadata Extraction Rules

The card plugin supports rule definitions for extracting metadata. Rules match URL patterns with regular expressions and extract data with CSS selectors:

```typescript
import { createCardPlugin } from 'mark-deco';

const cardPlugin = createCardPlugin({
  scrapingRules: [
    {
      pattern: '^https?://example\\.com/',  // URL pattern
      siteName: 'Example Site',
      fields: {   // Field configuration group
        title: {         // `title` field configuration
          rules: [{ selector: 'h1.main-title', method: 'text' }]
        },
        description: {   // `description` field configuration
          rules: [{ selector: '.description', method: 'text' }]
        },
        image: {         // `image` field configuration
          rules: [{ selector: '.hero-image img', method: 'attr', attr: 'src' }]
        }
      }
    }
  ]
});
```

`FieldConfig` (field configuration):
- `required`: Whether this field is required (boolean)
- `rules`: Array of extraction rules. Tried from top to bottom, and the first successful rule's result is used

`FieldRule` (extraction rule):
- `selector`: CSS selector (string or array)
- `method`: Extraction method (`text`, `attr`, `html`)
- `attr`: Attribute name when using `attr` method
- `multiple`: Whether multiple elements can be extracted (boolean)
- `processor`: Post-processing logic (regex, filters, currency formatting, etc.)

Each field's rules are defined as arrays and tried from top to bottom. Once a result is obtained from the first rule, extraction for that field is complete, and subsequent rules aren't executed.

Custom metadata extraction rule groups are applied before standard OGP metadata extraction, enabling more accurate information acquisition.

#### Extraction Method Selection

The `method` field in extraction rules specifies how to obtain data from HTML elements. Three methods are available:

|Extraction Method|Description|Usage Example|
|:----|:----|:----|
|`text`|Get element text content (HTML tags removed)|`<span>Hello World</span>` --> `"Hello World"`|
|`attr`|Get element attribute value|`<img src="image.jpg">` --> `"image.jpg"` (attr: `src`)|
|`html`|Get element inner HTML (including HTML tags)|`<div><b>Bold</b> text</div>` --> `"<b>Bold</b> text"`|

Specific usage examples for each method:

```typescript
// Text extraction example
{
  selector: 'h1.title',
  method: 'text'   // Default value
}

// Attribute extraction example
{
  selector: 'meta[property="og:image"]',
  method: 'attr',
  attr: 'content'  // Specify attribute name to get
}

// HTML extraction example
{
  selector: '.rich-content',
  method: 'html'   // Get including HTML tags
}
```

When `method` is omitted, `text` is used by default. When using the `attr` method, you must specify the attribute name with the `attr` field (`href` is used when omitted).

#### Post-processing Logic

You can use the `processor` field to perform post-processing on extracted data. It can be specified in two formats:

|Format|Details|
|:----|:----|
|Configuration object|Choose from several fixed methods. Since it's a built-in processing method, it can be used in ways like streaming entire rules in JSON.|
|Function|You can write custom processing with functions. Any post-processing can be handled.|

##### Configuration Object Format

```typescript
{
  selector: '.price',
  method: 'text',
  processor: {
    type: 'currency',
    params: {
      symbol: '$',
      locale: 'en-US'
    }
  }
}
```

Available configuration types:

|Type|Description|Parameter Example|Result Example|
|:----|:----|:----|:----|
|`regex`|String conversion with regular expressions|`replace: [{ pattern: '^Prefix:\\s*', replacement: '' }]`|Prefix removal|
|`filter`|Value filtering by conditions|`contains: 'keep', excludeContains: ['exclude']`|Extract values containing/not containing specific strings|
|`slice`|Partial array retrieval|`start: 0, end: 3`|Get only first 3 elements|
|`first`|Get only first value|(no parameters)|`['a', 'b', 'c']` --> `'a'`|
|`currency`|Currency formatting|`symbol: '$', locale: 'en-US'`|`'19.99'` --> `'$19.99'`|

Composite processing example:

```typescript
{
  selector: '.feature-list li',
  method: 'text',
  multiple: true,  // Get multiple elements
  processor: {
    type: 'filter',
    params: {
      excludeContains: ['advertise', 'buy'],  // Exclude advertising text
      minLength: 10  // Exclude items less than 10 characters
    }
  }
}
```

##### Function Format

In function format, you receive an array of extracted values and processing context, and return processed results:

```typescript
{
  selector: '.brand-info',
  method: 'text',
  processor: (values, context) => {
    // `values` is an array of extracted text
    // `context` contains information available for conversion
    if (values.length === 0 || !values[0]) return undefined;
    const text = values[0];
    const match = text.match(/ブランド:\s*([^の]+)/);
    return match?.[1]?.trim();
  }
}
```

The `context` argument passed to function format `processor` contains the following information:

|Property|Type|Description|Usage Example|
|:----|:----|:----|:----|
|`$`|`Cheerio`|Cheerio instance for entire page|`context.$.html()` to get entire page HTML|
|`$head`|`Cheerio`|Cheerio instance for HTML head section|`context.$head('meta[name="description"]')` to get metadata|
|`url`|`string`|Processing page URL|`context.url` for domain extraction or ASIN extraction|
|`locale`|`string`|Page language/region information|`context.locale` for language-specific processing|

Practical examples using `context`:

```typescript
// Example extracting ID from URL
processor: (values, context) => {
  const match = context.url.match(/\/dp\/([A-Z0-9]{10,})/);
  return match ? match[1] : undefined;
}

// Example extracting domain name
processor: (values, context) => {
  try {
    const url = new URL(context.url);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return 'Unknown Site';
  }
}

// Example performing language-specific processing
processor: (values, context) => {
  const isJapanese = context.locale?.startsWith('ja');
  return isJapanese 
    ? values[0]?.replace(/ブランド:\s*/, '')
    : values[0]?.replace(/Brand:\s*/, '');
}
```

#### Display Field Order Control

The card plugin allows control over displayed metadata items and their display order using the `displayFields` option:

```typescript
const cardPlugin = createCardPlugin({
  displayFields: {
    'image': 1,       // Display field name `image` first
    'title': 2,       // Display field name `title` second
    'description': 3, // Display field name `description` third
    // (Other metadata items won't be displayed even if obtained)
  }
});
```

Metadata field names follow the field names in metadata extraction rules.

#### Link URL Control

The card plugin allows control over URLs used for clickable links in generated cards through the `useMetadataUrlLink` option:

```typescript
// Use URL written in Markdown
const providedLinkCardPlugin = createCardPlugin({
  useMetadataUrlLink: false   // Use URL written in Markdown
});

// Use metadata URL (canonical URL of retrieved page)
const metadataLinkCardPlugin = createCardPlugin({
  useMetadataUrlLink: true    // Use OGP metadata canonical URL
});
```

Link URL selection priority:

|`useMetadataUrlLink`|URL Source Priority|Purpose|
|:----|:----|:----|
|`false`|Written URL|Preserve original URL with tracking parameters (default)|
|`true`|Extended canonical URL --> OGP URL --> Source URL --> Written URL|Expect normalized URL|

#### Fallback Processing

When network errors occur during scraping, the plugin provides appropriate fallback display. Here's an example when CORS restrictions prevent information retrieval:

```html
<div class="card-container card-fallback">
  <div class="card-body">
    <div class="card-header">
      <div class="card-title">📄 External Content</div>
      <div class="card-provider">example.com</div>
    </div>
    <div class="card-description">
      CORS Restriction - This site blocks cross-origin requests in browsers
    </div>
    <div class="card-content">
      <a href="[URL]" target="_blank" rel="noopener noreferrer" class="card-external-link">
        → Open example.com in new tab
      </a>
    </div>
  </div>
</div>
```

#### CSS Classes

HTML generated by the card plugin includes CSS classes for styling:

|CSS Class|Applied Element|Description|
|:----|:----|:----|
|`.card-container`| Overall container | Container for entire card |
|`.card-amazon`| Container | Additional class for Amazon products |
|`.card-fallback`| Container | Additional class for fallback display |
|`.card-link`| Link element | Clickable link for entire card |
|`.card-image`| Image container | Image display area |
|`.card-body`| Body section | Card main content area |
|`.card-header`| Header section | Container for title/provider info |
|`.card-title`| Title element | Card title |
|`.card-provider`| Provider element | Site name/favicon area |
|`.card-favicon`| Favicon element | Site favicon image |
|`.card-description`| Description element | Card description |
|`.card-content`| Content element | Additional content for fallback |
|`.card-external-link`| External link element | External link for fallback |
|`.card-{fieldName}`| Specific field | Classes corresponding to each field name (e.g., `.card-price`, `.card-rating`) |

Field-specific class naming convention:

Classes in `.card-{fieldName}` format are automatically generated based on field names defined in metadata extraction rules. For example, the `price` field gets `.card-price`, and the `rating` field gets `.card-rating`.

### Mermaid Plugin

Using the Mermaid plugin, you can create diagrams and flowcharts using [mermaid.js](https://mermaid.js.org/) notation:

```typescript
import { createMarkdownProcessor, createMermaidPlugin, createCachedFetcher } from 'mark-deco';

// Create fetcher
const fetcher = createCachedFetcher('MyApp/1.0');

// Generate Mermaid plugin
const mermaidPlugin = createMermaidPlugin();

const processor = createMarkdownProcessor({
  plugins: [mermaidPlugin],
  fetcher
});

const markdown = `# Diagram Example

\`\`\`mermaid
graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Action1]
  B -->|No| D[Action2]
  C --> E[End]
  D --> E
\`\`\``;

const result = await processor.process(markdown, "id");

// Contains <div class="mermaid">...</div>
console.log(result.html);
```

HTML like this is generated:

```html
<div class="mermaid-wrapper">
  <style> { ... } </style>
  <div class="mermaid" id="id-1">graph TD
  A[Start] --&gt; B{Decision}
  B --&gt;|Yes| C[Action1]
  B --&gt;|No| D[Action2]
  C --&gt; E[End]
  D --&gt; E</div>
</div>
```

Note that the Mermaid plugin doesn't generate actual SVG graphics, but creates HTML elements to pass to Mermaid. This means it's insufficient to draw graphics alone, and you need to introduce the Mermaid main script when displaying HTML.

Generated HTML has the following characteristics:

* Diagram code is properly HTML-escaped to prevent XSS attacks.
* Wrapped with `mermaid-wrapper` class and includes styles that override SVG size constraints.
* Unique IDs are assigned by default, allowing proper identification when multiple diagrams exist.

For introducing the Mermaid script itself, refer to Mermaid documentation. Here's a simple example:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Mermaid Rendering</title>
  <!-- Mermaid.js CDN -->
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
</head>
<body>
  <div id="content">
    <!-- Insert processor converted result HTML here -->
  </div>
  <script>
    // Initialize Mermaid
    mermaid.initialize({ 
      startOnLoad: true,
      theme: 'default'
    });
  </script>
</body>
</html>
```

#### Considerations for Dynamically Updating HTML in Browser Environments

Normally, Mermaid parses statically placed Mermaid code, renders it, and displays diagrams by inserting SVG tags in place.
Therefore, even if you dynamically update the DOM (`innerHTML`, etc.), SVG tags aren't automatically generated. You need to manually trigger Mermaid re-rendering.

Here's a simple example of dynamically updating HTML containing Mermaid diagrams:

```typescript
// Function to process Markdown
const processAndUpdate = async () => {
  // ...

  // Execute MarkDeco processor
  const result = await processor.process(markdown, "id");
  
  // Update DOM
  document.getElementById('output').innerHTML = result.html;
  
  // If Mermaid diagrams exist
  if (result.html.includes('class="mermaid"')) {
    // Wait for DOM update completion (100ms)
    setTimeout(() => {
      // Initialize Mermaid to generate SVG
      window.mermaid.init(
        undefined,
        document.querySelectorAll('.mermaid:not([data-processed="true"])'));
    }, 100);
  }
};
```

## Creating Custom Plugins

MarkDeco allows you to implement and use your own plugins, not just built-in ones.

Plugins can intercept Markdown code block notation. In the following example, processing is delegated to a plugin named `foobar`:

```markdown
\`\`\`foobar
Custom plugin directive text...
\`\`\`
```

The text "Custom plugin directive text..." inside the code block is passed to the plugin. The plugin should interpret this text and provide custom functionality:

```typescript
import type { Plugin, PluginContext } from 'mark-deco';

// Define custom plugin as a function
const createFooBarPlugin = (): Plugin => {
  // content contains code block text, context contains information and functions needed for operations
  const processBlock = async (content: string, context: PluginContext): Promise<string> => {
    // Implement custom processing (this example simply outputs text in a div)
    return `<div class="custom-block">${content}</div>`;
  };
  // Return Plugin object
  return {
    name: 'foobar',   // Plugin name
    processBlock      // Plugin handler
  };
};

// Generate and register plugin
const fooBarPlugin = createFooBarPlugin();
const processor = createMarkdownProcessor({ 
  plugins: [ fooBarPlugin ],
  fetcher
});
```

### PluginContext

The plugin's `processBlock` method receives a `PluginContext` as the second argument. This object contains the functionality and data needed for plugin processing:

```typescript
interface PluginContext {
  /** Logger instance for log output */
  readonly logger: Logger;
  /** AbortSignal for processing cancellation (undefined if not specified) */
  readonly signal: AbortSignal | undefined;
  /** Frontmatter data extracted from Markdown */
  readonly frontmatter: FrontmatterData;
  /** Unique ID generation function (prefix + sequential number format) */
  readonly getUniqueId: () => string;
  /** Fetcher for HTTP requests */
  readonly fetcher: FetcherType;
}
```

Usage of each property:

|Property|Type|Description|Usage Example|
|:----|:----|:----|:----|
|`logger`|`Logger`| Used for debug info and error log output |
|`signal`|`AbortSignal \| undefined`| Used for supporting long-running process cancellation |
|`frontmatter`|`FrontmatterData`| Conditional branching based on frontmatter data |
|`getUniqueId`|`() => string`| Used for assigning unique IDs to HTML elements |
|`fetcher`|`FetcherType`| Used for external API access and page scraping |

Practical examples using `context`:

```typescript
// Example of extracting ID from URL
processor: (values, context) => {
  const match = context.url.match(/\/dp\/([A-Z0-9]{10,})/);
  return match ? match[1] : undefined;
}

// Example of extracting domain name
processor: (values, context) => {
  try {
    const url = new URL(context.url);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return 'Unknown Site';
  }
}

// Example of language-specific processing
processor: (values, context) => {
  const isJapanese = context.locale?.startsWith('ja');
  return isJapanese 
    ? values[0]?.replace(/ブランド:\s*/, '')
    : values[0]?.replace(/Brand:\s*/, '');
}
```

#### Display Field Order Control

The card plugin allows you to control which metadata items are displayed and their order using the `displayFields` option:

```typescript
const cardPlugin = createCardPlugin({
  displayFields: {
    'image': 1,       // Display field name `image` first
    'title': 2,       // Display field name `title` second
    'description': 3, // Display field name `description` third
    // (Other metadata items are not displayed even if retrieved)
  }
});
```

Metadata field names follow the field names in the metadata extraction rules.

#### Link URL Control

The card plugin allows you to control the URL used for clickable links in generated cards through the `useMetadataUrlLink` option:

```typescript
// Use URL written in Markdown
const providedLinkCardPlugin = createCardPlugin({
  useMetadataUrlLink: false   // Use URL written in Markdown
});

// Use metadata URL (canonical URL of retrieved page)
const metadataLinkCardPlugin = createCardPlugin({
  useMetadataUrlLink: true    // Use canonical URL from OGP metadata
});
```

Link URL selection priority:

|`useMetadataUrlLink`|URL Source Priority|Use Case|
|:----|:----|:----|
|`false`|Written URL|Preserve original URL with tracking parameters (default)|
|`true`|Extended canonical URL --> OGP URL --> Source URL --> Written URL|Expect normalized URL|

#### Fallback Processing

When network errors occur during scraping, the plugin provides appropriate fallback display. Here's an example when CORS restrictions prevent information retrieval:

```html
<div class="card-container card-fallback">
  <div class="card-body">
    <div class="card-header">
      <div class="card-title">📄 External Content</div>
      <div class="card-provider">example.com</div>
    </div>
    <div class="card-description">
      CORS restriction - This site blocks cross-origin requests in browsers
    </div>
    <div class="card-content">
      <a href="[URL]" target="_blank" rel="noopener noreferrer" class="card-external-link">
        → Open example.com in new tab
      </a>
    </div>
  </div>
</div>
```

#### CSS Classes

The HTML generated by the card plugin includes CSS classes for styling:

|CSS Class|Applied Element|Description|
|:----|:----|:----|
|`.card-container`| Entire container | Container for the entire card |
|`.card-amazon`| Container | Additional class for Amazon products |
|`.card-fallback`| Container | Additional class for fallback display |
|`.card-link`| Link element | Clickable link for the entire card |
|`.card-image`| Image container | Image display area |
|`.card-body`| Body section | Card content area |
|`.card-header`| Header section | Container for title and provider information |
|`.card-title`| Title element | Card title |
|`.card-provider`| Provider element | Site name and favicon area |
|`.card-favicon`| Favicon element | Site favicon image |
|`.card-description`| Description element | Card description text |
|`.card-content`| Content element | Additional content for fallback |
|`.card-external-link`| External link element | External link for fallback |
|`.card-{fieldName}`| Specific field | Classes corresponding to each field name (e.g., `.card-price`, `.card-rating`) |

Field-specific class naming convention:

Classes in the format `.card-{fieldName}` are automatically generated based on field names defined in metadata extraction rules. For example, a `price` field gets `.card-price`, and a `rating` field gets `.card-rating`.

### Custom Unified Plugins

You can extend `unified` processing capabilities by adding `remark` and `rehype` plugins. This feature is very advanced and requires knowledge of `unified`, `remark`, and `rehype`:

```typescript
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';

const result = await processor.process(
  markdown, "id", {
    // Advanced options
    advancedOptions: {
      // Add remark plugins (processed before GFM)
      remarkPlugins: [
        remarkMath,                    // Add math support
        [remarkToc, { tight: true }]   // Add table of contents with options
      ],
      // Add rehype plugins (processed after HTML generation)
      rehypePlugins: [
        rehypeKatex,                   // Render math with KaTeX
        [rehypeHighlight, {            // Syntax highlighting with options
          detect: true,
          subset: ['javascript', 'typescript', 'python']
        }]
      ]
    }
  });
```

----

## CLI Application

MarkDeco includes a CLI application for processing Markdown files from the command line. It supports reading from standard input, file processing, and detailed customization using configuration files.

### Installation

```bash
# Global installation
npm install -g mark-deco-cli

# Or run directly with npx
npx mark-deco-cli input.md
```

### Basic Usage

```bash
# From standard input to standard output
echo "# Hello World" | mark-deco-cli

# Process file
mark-deco-cli -i input.md

# Save output to file
mark-deco-cli -i input.md -o output.html
```

### Command Line Options

```
Options:
  -i, --input <file>              Input Markdown file (default: standard input)
  -o, --output <file>             Output HTML file (default: standard output)
  -c, --config <file>             Configuration file path
  -p, --plugins <plugins...>      Enable specific plugins (oembed, card, mermaid)
      --no-plugins                Disable all standard plugins
      --unique-id-prefix <prefix>  Unique ID prefix (default: "section")
      --hierarchical-heading-id    Use hierarchical heading IDs (default: true)
      --content-based-heading-id   Use content-based heading IDs (default: false)
      --frontmatter-output <file>  Output frontmatter as JSON to specified file
      --heading-tree-output <file> Output heading tree as JSON to specified file
  -h, --help                      Display help
  -V, --version                   Display version
```

### Usage Examples

```bash
# Basic Markdown processing
echo "# Hello World" | mark-deco-cli

# File processing with custom ID prefix
mark-deco-cli -i document.md --unique-id-prefix "doc"

# Disable all plugins
mark-deco-cli -i simple.md --no-plugins

# Enable only specific plugins
mark-deco-cli -i content.md -p oembed mermaid

# Use configuration file
mark-deco-cli -i content.md -c config.json

# Output frontmatter and HTML separately
mark-deco-cli -i article.md -o article.html --frontmatter-output metadata.json
```

### Configuration File

You can specify default options in JSON format configuration file:

```json
{
  "plugins": ["oembed", "card", "mermaid"],
  "uniqueIdPrefix": "section",
  "hierarchicalHeadingId": true,
  "contentBasedHeadingId": false,
  "oembed": {
    "enabled": true,
    "timeout": 5000
  },
  "card": {
    "enabled": true
  },
  "mermaid": {
    "enabled": true,
    "theme": "default"
  }
}
```

----

## License

Under MIT.

## Changelog

* 0.1.0:
  * First public release.
