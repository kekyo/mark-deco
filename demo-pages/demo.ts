// Polyfills are loaded via HTML script tag before this file

import {
  createMarkdownProcessor,
  createOEmbedPlugin,
  createCardPlugin,
  createMermaidPlugin,
  getConsoleLogger,
  createCachedFetcher,
  createMemoryCacheStorage,
} from 'mark-deco';
import type { MarkdownProcessor } from 'mark-deco';
import { createLocalCacheStorage } from 'mark-deco/browser';
import { defaultProviderList } from 'mark-deco/misc';

// Custom Buffer type for browser environment
interface BufferLike {
  data: Uint8Array;
  length: number;
  toString(): string;
}

// Global variables for processor components
let processor: MarkdownProcessor | null = null;

// Ensure Buffer is available as a fallback
if (typeof globalThis.Buffer === 'undefined') {
  console.warn('⚠️ Buffer polyfill not loaded, creating minimal fallback');

  class MinimalBuffer implements BufferLike {
    data: Uint8Array;

    constructor(data?: string | number | ArrayBuffer | Uint8Array) {
      if (typeof data === 'string') {
        this.data = new TextEncoder().encode(data);
      } else if (typeof data === 'number') {
        this.data = new Uint8Array(data);
      } else if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
        this.data = new Uint8Array(data);
      } else {
        this.data = new Uint8Array(0);
      }
    }

    static from(data: string | ArrayBuffer | Uint8Array): MinimalBuffer {
      return new MinimalBuffer(data);
    }

    static isBuffer(obj: unknown): obj is MinimalBuffer {
      return obj instanceof MinimalBuffer;
    }

    toString(): string {
      return new TextDecoder().decode(this.data);
    }

    get length(): number {
      return this.data.length;
    }
  }

  const BufferConstructor = MinimalBuffer as unknown as BufferConstructor;
  globalThis.Buffer = BufferConstructor;
  (window as unknown as { Buffer: BufferConstructor }).Buffer =
    BufferConstructor;
}

// Debug polyfills setup
console.log('🔧 Checking polyfills setup:', {
  'globalThis.Buffer': typeof globalThis.Buffer !== 'undefined',
  'globalThis.process': typeof globalThis.process !== 'undefined',
  'globalThis.global': typeof globalThis.global !== 'undefined',
  'window.Buffer':
    typeof (window as { Buffer?: unknown }).Buffer !== 'undefined',
});

// Get DOM elements early
const markdownInput = document.getElementById(
  'markdown-input'
) as HTMLTextAreaElement | null;
const processButton = document.getElementById(
  'process-button'
) as HTMLButtonElement | null;
const frontmatterOutput = document.getElementById(
  'frontmatter-output'
) as HTMLPreElement | null;
const htmlOutput = document.getElementById(
  'html-output'
) as HTMLDivElement | null;
const htmlSourceOutput = document.getElementById(
  'html-source-output'
) as HTMLPreElement | null;

// Check if DOM elements exist
if (
  !markdownInput ||
  !processButton ||
  !frontmatterOutput ||
  !htmlOutput ||
  !htmlSourceOutput
) {
  console.error('❌ Required DOM elements not found:', {
    markdownInput: !!markdownInput,
    processButton: !!processButton,
    frontmatterOutput: !!frontmatterOutput,
    htmlOutput: !!htmlOutput,
    htmlSourceOutput: !!htmlSourceOutput,
  });
}

// Initialize tab functionality
function initializeTabs(): void {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  console.log('🔧 Initializing tabs:', {
    tabButtons: tabButtons.length,
    tabContents: tabContents.length,
  });

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');

      console.log('🖱️ Tab clicked:', targetTab);

      // Remove active class from all tab buttons and contents
      tabButtons.forEach((btn) => btn.classList.remove('active'));
      tabContents.forEach((content) => content.classList.remove('active'));

      // Add active class to clicked tab button
      button.classList.add('active');

      // Add active class to corresponding tab content
      if (targetTab === 'preview') {
        const previewTab = document.getElementById('html-preview-tab');
        previewTab?.classList.add('active');
      } else if (targetTab === 'source') {
        const sourceTab = document.getElementById('html-source-tab');
        sourceTab?.classList.add('active');
      }
    });
  });
}

// Function to escape HTML
function escapeHtml(html: string): string {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

// Function to format HTML source
function formatHtmlSource(html: string): string {
  // Already formatted by library, return as is
  return html;
}

// Set initial sample text
const sampleMarkdown = `---
title: Sample Article
author: Test User
date: 2024-01-01
tags: [markdown, test]
description: Test page for MarkDeco
---

# Sample Article

This is a test page for **MarkDeco**.

## Features

- frontmatter parsing
- Markdown processing
- HTML generation
- Plugin system
- oEmbed plugin
- Card plugin (NEW!)

### Code Blocks

\`\`\`javascript
console.log('Hello, World!');
const message = "MarkDeco";
console.log(message);
\`\`\`

### Lists

1. Ordered list
2. **Bold** text
3. *Italic* text

- Unordered list
- [Link example](https://example.com)
- \`Inline code\`

### Quotes

> This is a quote.
> Multi-line quotes are also possible.

### Tables

| Item | Description | Value |
|------|-------------|-------|
| Processor | Markdown Enhanced | 1.0.0 |
| Plugin | OEmbed | Enabled |
| Plugin | Card | Enabled |
| Frontmatter | YAML | Supported |

## Remark-Attr Examples

### CSS Attributes on Elements

This is a **highlighted paragraph** with custom styling. {.highlight-text #important-paragraph}

#### Heading with Custom Styling {.custom-header #styled-heading}

Links can also have [custom attributes](https://example.com){.external-link target="_blank"}.

Images support attributes too:
![Sample Image](https://picsum.photos/300/200){.responsive-image #hero-image}

### Code Blocks with Attributes

**Comparison Example - Same JavaScript Code, Different CSS Classes:**

\`\`\`javascript {.code-highlight}
// With .code-highlight class
// (blue theme: blue border, blue background, blue shadow)
function processData(input) {
  const result = input.map(item => ({
    id: item.id,
    value: item.value * 2
  }));
  return result.filter(item => item.value > 10);
}
\`\`\`

\`\`\`javascript {.js-code}
// With .js-code class
// (orange theme: orange border, brown background, orange shadow)
function processData(input) {
  const result = input.map(item => ({
    id: item.id,
    value: item.value * 2
  }));
  return result.filter(item => item.value > 10);
}
\`\`\`

### Inline Code with Custom Classes

**Comparison - Same Inline Code, Different CSS Classes:**

Regular text with \`npm install package\`{.highlight-code} (gradient background) and \`npm install package\`{.warning-code} (orange background) commands.

### Lists with Attributes

- Item with custom class {.special-item}
- Another item {.highlight-item}
- Third item
{.custom-list #my-list}

1. Numbered item {.numbered-special}
2. Another numbered item
3. Final item
{.ordered-list-custom}

### Blockquotes with Attributes

**Comparison - Same Quote, Different CSS Classes:**

> "The best way to predict the future is to invent it." - Alan Kay

> "The best way to predict the future is to invent it." - Alan Kay

{.fancy-quote}

## OEmbed Plugin Examples

### YouTube Video (Short URL)

\`\`\`oembed
https://youtu.be/1La4QzGeaaQ
\`\`\`

### YouTube Video (Regular URL)

\`\`\`oembed
https://www.youtube.com/watch?v=1La4QzGeaaQ
\`\`\`

### 4:3 Aspect Ratio Test

\`\`\`oembed
https://youtu.be/lwuMTMhY85c
\`\`\`

### Flickr (Fails with CORS in browser)

\`\`\`oembed
https://flickr.com/photos/bees/2362225867/
\`\`\`

## Card Plugin Examples

**Note**: In browser environments, many sites cannot directly fetch HTML due to CORS (Cross-Origin Resource Sharing) restrictions. Most of the examples below will show fallback display, which is normal behavior.

### GitHub Repository

\`\`\`card
https://github.com/microsoft/TypeScript
\`\`\`

### Twitter

\`\`\`card
https://twitter.com/buildwithgatsby/status/1296841485642690562
\`\`\`

### Medium Article

\`\`\`card
https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0
\`\`\`

### Zenn Article

\`\`\`card
https://zenn.dev/azukiazusa/articles/react-testing-library-user-event
\`\`\`

### Qiita Article

\`\`\`card
https://qiita.com/uhyo/items/e2fdef2d3236b9bfe74a
\`\`\`

### Dev.to Article

\`\`\`card
https://dev.to/azure/10-things-to-know-about-azure-static-web-apps-3n4i
\`\`\`

### Stack Overflow Question

\`\`\`card
https://stackoverflow.com/questions/1732348/regex-match-open-tags-except-xhtml-self-contained-tags
\`\`\`

### Wikipedia Article

\`\`\`card
https://en.wikipedia.org/wiki/Markdown
\`\`\`

### Reddit Post

\`\`\`card
https://www.reddit.com/r/programming/comments/123456/test_post/
\`\`\`

### Hacker News Item

\`\`\`card
https://news.ycombinator.com/item?id=12345678
\`\`\`

### Site with No Metadata

\`\`\`card
https://example.com
\`\`\`

### Non-existent Site

\`\`\`card
https://this-site-does-not-exist-12345.com
\`\`\`

## Mermaid Plugin Examples

### Simple Flowchart

\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
\`\`\`

### Sequence Diagram

\`\`\`mermaid
sequenceDiagram
    participant A as Alice
    participant B as Bob
    A->>B: Hello Bob, how are you?
    B-->>A: Great!
    A->>B: Let's work together
    B-->>A: Sounds good!
\`\`\`

### Pie Chart

\`\`\`mermaid
pie title Pets adopted by volunteers
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15
\`\`\`

### Class Diagram

\`\`\`mermaid
classDiagram
    class Animal{
        +int age
        +String gender
        +isMammal()
        +mate()
    }
    class Duck{
        +String beakColor
        +swim()
        +quack()
    }
    Animal <|-- Duck
\`\`\`

### Gantt Chart

\`\`\`mermaid
gantt
    title A Gantt Diagram
    dateFormat  YYYY-MM-DD
    section Section
    A task           :a1, 2014-01-01, 30d
    Another task     :after a1, 20d
    section Another
    Task in sec      :2014-01-12, 12d
    another task     :24d
\`\`\`

---

## Usage

1. Edit the markdown content in the left panel
2. Click "Process Markdown" button
3. View the results in the right panel tabs:
   - **Frontmatter**: Parsed YAML frontmatter
   - **HTML Preview**: Rendered HTML
   - **HTML Source**: Generated HTML source code

## Browser Limitations

Due to browser security restrictions (CORS), some external services may not work properly:

- OEmbed providers that don't support CORS
- Websites that don't allow cross-origin requests for metadata extraction
- Some card generation may fall back to simple link display

This is normal behavior for browser-based markdown processors.

**Important Notes**: 

- Most oEmbed providers **will work** in browser environments due to CORS headers
- YouTube, Vimeo, and many major providers support CORS for oEmbed endpoints
- Card plugin will **show fallback displays** for most sites due to CORS restrictions
- All plugins work fully in Node.js environments without CORS limitations
`;

// Function to check localStorage availability
function checkLocalStorageAvailability(): boolean {
  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    console.warn('⚠️ localStorage is not available:', e);
    return false;
  }
}

// Initialize processor with proper error handling
function initializeProcessor(): boolean {
  try {
    console.log('🔧 Initializing processor...');

    // Create cache storage (localStorage or in-memory fallback)
    const cacheStorage = checkLocalStorageAvailability()
      ? createLocalCacheStorage()
      : (() => {
          console.log('📦 Using in-memory cache as localStorage fallback');
          return createMemoryCacheStorage();
        })();
    console.log('✅ Cache storage initialized');

    // Create cached fetcher
    console.log('🌐 Creating cached fetcher...');
    const cachedFetcher = createCachedFetcher(
      'MarkdownEnhancedProcessor/1.0.0 (Demo)', // userAgent
      60000, // timeout (60 seconds)
      cacheStorage, // cacheStorage
      {
        cacheTTL: 30 * 60 * 1000, // 30 minutes
      }
    );
    console.log('✅ Cached fetcher created');

    // Create plugins
    console.log('🔌 Creating plugins...');
    const oembedPlugin = createOEmbedPlugin(defaultProviderList, {
      maxRedirects: 5,
      timeoutEachRedirect: 15000,
    });
    const cardPlugin = createCardPlugin();
    const mermaidPlugin = createMermaidPlugin();
    console.log('✅ Plugins created');

    // Create processor with both plugins and cached fetcher
    console.log('⚙️ Creating processor...');
    processor = createMarkdownProcessor({
      plugins: [oembedPlugin, cardPlugin, mermaidPlugin],
      logger: getConsoleLogger(),
      fetcher: cachedFetcher,
    });
    console.log('✅ Processor created with plugins');

    console.log('🎉 Processor initialization completed successfully!');
    console.log('Processor configuration:');
    console.log('- Environment: Browser');
    console.log('- Cache type: localStorage');
    console.log('- Cache TTL: 30 minutes');
    console.log('- Plugins: oEmbed, Card, Mermaid');

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize processor:', error);
    return false;
  }
}

// Function to process Markdown
async function processMarkdown(): Promise<void> {
  if (!processor) {
    console.error('❌ Processor not initialized');
    return;
  }

  if (
    !markdownInput ||
    !frontmatterOutput ||
    !htmlOutput ||
    !htmlSourceOutput
  ) {
    console.error('❌ Required DOM elements not found');
    return;
  }

  try {
    console.log('🔄 Processing markdown...');

    const markdownText = markdownInput.value;
    const result = await processor.process(markdownText, 'demo');

    console.log('✅ Processing completed:', result);

    // Display frontmatter with syntax highlighting
    const frontmatterJson = result.frontmatter
      ? JSON.stringify(result.frontmatter, undefined, 2)
      : '{}';
    frontmatterOutput.innerHTML = `<code class="language-json">${escapeHtml(frontmatterJson)}</code>`;

    // Display HTML source with syntax highlighting
    const htmlSource = formatHtmlSource(result.html);
    htmlSourceOutput.innerHTML = `<code class="language-html">${escapeHtml(htmlSource)}</code>`;

    // Display HTML
    htmlOutput.innerHTML = result.html;

    // Re-render mermaid diagrams if they exist
    if (
      result.html.includes('class="mermaid"') &&
      'rerenderMermaid' in window &&
      typeof (window as unknown as { rerenderMermaid: () => void })
        .rerenderMermaid === 'function'
    ) {
      setTimeout(() => {
        (
          window as unknown as { rerenderMermaid: () => void }
        ).rerenderMermaid();
      }, 100);
    }

    // Re-highlight code blocks if they exist (including frontmatter and source)
    if (
      'rehighlightCode' in window &&
      typeof (window as unknown as { rehighlightCode: () => void })
        .rehighlightCode === 'function'
    ) {
      setTimeout(() => {
        (
          window as unknown as { rehighlightCode: () => void }
        ).rehighlightCode();
      }, 150);
    }

    // Force highlighting of specific elements
    setTimeout(() => {
      if (frontmatterOutput) {
        const frontmatterCode = frontmatterOutput.querySelector('code');
        if (frontmatterCode && 'hljs' in window) {
          (
            window as { hljs: { highlightElement: (element: Element) => void } }
          ).hljs.highlightElement(frontmatterCode);
        }
      }
      if (htmlSourceOutput) {
        const htmlSourceCode = htmlSourceOutput.querySelector('code');
        if (htmlSourceCode && 'hljs' in window) {
          (
            window as { hljs: { highlightElement: (element: Element) => void } }
          ).hljs.highlightElement(htmlSourceCode);
        }
      }
    }, 200);

    console.log('✅ Results displayed successfully');
  } catch (error) {
    console.error('❌ Failed to process markdown:', error);

    // Display error in outputs
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    frontmatterOutput.innerHTML = `<code class="language-json">${escapeHtml(`{"error": "${errorMessage}"}`)}</code>`;
    htmlOutput.innerHTML = `<div style="color: red; padding: 10px; border: 1px solid red; border-radius: 4px;">
      <strong>Error:</strong> ${escapeHtml(errorMessage)}
    </div>`;
    htmlSourceOutput.innerHTML = `<code class="language-html">${escapeHtml(`<!-- Error: ${errorMessage} -->`)}</code>`;
  }
}

// Function to load sample text
function loadSampleText(): void {
  if (markdownInput) {
    markdownInput.value = sampleMarkdown;
    console.log('📝 Sample text loaded');
  }
}

// Function to clear all content
function clearContent(): void {
  if (markdownInput) {
    markdownInput.value = '';
  }
  if (frontmatterOutput) {
    frontmatterOutput.innerHTML = '';
  }
  if (htmlOutput) {
    htmlOutput.innerHTML = '';
  }
  if (htmlSourceOutput) {
    htmlSourceOutput.innerHTML = '';
  }
  console.log('🗑️ Content cleared');
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 DOM loaded, initializing application...');

  try {
    // Initialize tabs
    initializeTabs();

    // Initialize processor
    const success = initializeProcessor();
    if (!success) {
      throw new Error('Failed to initialize processor');
    }

    // Load sample text
    loadSampleText();

    // Set up event listeners
    if (processButton) {
      processButton.addEventListener('click', () => {
        void processMarkdown();
      });
    }

    // Set up additional buttons
    const loadSampleButton = document.getElementById('load-sample-button');
    if (loadSampleButton) {
      loadSampleButton.addEventListener('click', loadSampleText);
    }

    const clearButton = document.getElementById('clear-button');
    if (clearButton) {
      clearButton.addEventListener('click', clearContent);
    }

    console.log('✅ Application initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
  }
});
