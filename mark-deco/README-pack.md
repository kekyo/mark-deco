# MarkDeco

Flexible Markdown to HTML conversion library.

[![npm version](https://img.shields.io/npm/v/mark-deco.svg)](https://www.npmjs.com/package/mark-deco)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What is this?

Flexible Markdown to HTML conversion library written in TypeScript.
It interprets GitHub Flavored Markdown (GFM) and outputs HTML.
Supports frontmatter parsing, heading analysis, source code formatting, oEmbed/card/Mermaid graph rendering, and custom code block processing through plugin extensions.

- Can be used to render HTML from Markdown input.
- Simple interface makes it very easy to use.
- Highly independent with minimal runtime requirements. Works in both Node.js and browser environments.
- Built-in plugins support oEmbed, cards, and Mermaid.js.

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
  fetcher,
});

// Markdown to convert
const markdown = `---
title: Sample Article
author: John Doe
---

# Hello World

This is a test article.`;

// Render HTML from Markdown input
const result = await processor.process(markdown, 'id'); // ID prefix for HTML elements (described later)

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

A "fetcher" is an abstraction for external server access. It's primarily used by oEmbed and card plugins for external API calls and page scraping.
The argument passed to the fetcher is a user agent string, which is applied to HTTP request headers when accessing external servers.

HTML converted by the MarkDeco processor is formatted in a readable manner. Advanced options allow fine-tuning of formatting conditions.

### Aborting Processor Operations

While the MarkDeco processor engine itself doesn't access external servers, plugins may access external servers as needed (e.g., when using oEmbed APIs or performing page scraping).

To enable operation cancellation in such cases, pass an ECMAScript standard `AbortSignal` instance to notify cancellation signals:

```typescript
// Abort controller
const abortController = new AbortController();

// ...

// Convert Markdown to HTML
const result = await processor.process(markdown, 'id', {
  // Specify processor options
  signal: abortController.signal, // Cancellation support
});
```

For usage of `AbortController` and `AbortSignal`, refer to ECMAScript documentation.

### Default Image Class

Assign a default CSS class to all Markdown images with `defaultImageClassName`. The value is merged with any class specified via `remark-attr`.

```typescript
await processor.process(markdown, 'id', {
  defaultImageClassName: 'content-image shadow',
});
```

### CLI Interface

Although MarkDeco is a library, a CLI interface is also available in the package that allows you to easily try out MarkDeco. This allows you to try out conversions without having to write code in TypeScript, or call it as an independent application from another code.

```bash
# Take Markdown from standard input and output HTML
echo "# Hello World" | mark-deco-cli
```

## Documentation

For detailed documentation and advanced features, please visit our [GitHub repository](https://github.com/kekyo/mark-deco).

Key features include:

- Frontmatter Information Extraction - Parse YAML frontmatter from Markdown files
- Heading ID Generation and Heading Information Extraction - Automatically generate unique IDs for headings
- Fetcher and Cache System - External HTTP request management with configurable caching
- Built-in Plugins - oEmbed, card, and Mermaid plugins for rich content embedding
- Creating Custom Plugins - Develop custom plugins to extend Markdown processing
- CLI Application - Command-line interface for batch processing

## License

Under MIT.
