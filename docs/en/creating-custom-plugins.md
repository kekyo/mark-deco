## Creating Custom Plugins

mark-deco allows you to implement and use your own plugins, not just built-in ones.

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
  const processBlock = async (
    content: string,
    context: PluginContext
  ): Promise<string> => {
    // Implement custom processing (this example simply outputs text in a div)
    return `<div class="custom-block">${content}</div>`;
  };
  // Return Plugin object
  return {
    name: 'foobar', // Plugin name
    processBlock, // Plugin handler
  };
};

// Generate and register plugin
const fooBarPlugin = createFooBarPlugin();
const processor = createMarkdownProcessor({
  plugins: [fooBarPlugin],
  fetcher,
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

| Property      | Type                       | Description                                           | Usage Example |
| :------------ | :------------------------- | :---------------------------------------------------- | :------------ |
| `logger`      | `Logger`                   | Used for debug info and error log output              |
| `signal`      | `AbortSignal \| undefined` | Used for supporting long-running process cancellation |
| `frontmatter` | `FrontmatterData`          | Conditional branching based on frontmatter data       |
| `getUniqueId` | `() => string`             | Used for assigning unique IDs to HTML elements        |
| `fetcher`     | `FetcherType`              | Used for external API access and page scraping        |

Practical examples using `context`:

```typescript
// Example of extracting ID from URL
processor: (values, context) => {
  const match = context.url.match(/\/dp\/([A-Z0-9]{10,})/);
  return match ? match[1] : undefined;
};

// Example of extracting domain name
processor: (values, context) => {
  try {
    const url = new URL(context.url);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return 'Unknown Site';
  }
};

// Example of language-specific processing
processor: (values, context) => {
  const isJapanese = context.locale?.startsWith('ja');
  return isJapanese
    ? values[0]?.replace(/ブランド:\s*/, '')
    : values[0]?.replace(/Brand:\s*/, '');
};
```

### Custom Unified Plugins

You can extend `unified` processing capabilities by adding `remark` and `rehype` plugins. This feature is very advanced and requires knowledge of `unified`, `remark`, and `rehype`:

```typescript
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';

const result = await processor.process(markdown, 'id', {
  // Advanced options
  advancedOptions: {
    // Add remark plugins (processed before GFM)
    remarkPlugins: [
      remarkMath, // Add math support
      [remarkToc, { tight: true }], // Add table of contents with options
    ],
    // Add rehype plugins (processed after HTML generation)
    rehypePlugins: [
      rehypeKatex, // Render math with KaTeX
      [
        rehypeHighlight,
        {
          // Syntax highlighting with options
          detect: true,
          subset: ['javascript', 'typescript', 'python'],
        },
      ],
    ],
  },
});
```
