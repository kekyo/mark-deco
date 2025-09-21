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
