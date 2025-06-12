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
