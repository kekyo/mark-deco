# MarkDeco

Flexible Markdown to HTML conversion library.

[![Project Status: WIP – Initial development is in progress, but there has not yet been a stable, usable release suitable for the public.](https://www.repostatus.org/badges/latest/wip.svg)](https://www.repostatus.org/#wip)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

|Package|npm|
|:----|:----|
|`mark-deco`|[![npm version](https://img.shields.io/npm/v/mark-deco.svg)](https://www.npmjs.com/package/mark-deco)|
|`mark-deco-cli`|[![npm version](https://img.shields.io/npm/v/mark-deco-cli.svg)](https://www.npmjs.com/package/mark-deco-cli)|

[(Japanese is here/日本語はこちら)](./README_ja.md)

## What is this?

Flexible Markdown to HTML conversion library written in TypeScript.
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

### Automatic Title Extraction

By default, MarkDeco copies the first base-level heading into `frontmatter.title` and removes that heading from the content. Adjust this with `headerTitleTransform`:

```typescript
await processor.process(markdown, 'id', { headerTitleTransform: 'extract' });
```

Use `extract` to keep the heading while copying the title, `extractAndRemove` (default) to remove it, or `none` to skip the behaviour entirely.

### Default Image Class

You can assign a default CSS class to all Markdown images with `defaultImageClassName`.

```typescript
// Add the .content-image and .shadow classes to the <img> tags
await processor.process(markdown, 'id', {
  defaultImageClassName: 'content-image shadow',
});
```

### CLI Interface

Although MarkDeco is a library, a CLI interface is also available in the package that allows you to easily try out MarkDeco. This allows you to try out conversions without having to write code in TypeScript, or call it as an independent application from another code.

```bash
# Take Markdown from standard input and output HTML 
$ echo "# Hello World" | mark-deco
```

For more information, see [CLI documentation](./docs/en/cli-application.md).

----

## Documentation

MarkDeco has many useful features. For further details, please see below.

- [Frontmatter Information Extraction](./docs/en/frontmatter-extraction.md) - Parse YAML frontmatter from Markdown files to extract metadata like title, author, tags, and publication date
- [Heading ID Generation and Heading Information Extraction](./docs/en/heading-id-generation.md) - Automatically generate unique IDs for headings with hierarchical or content-based naming strategies
- [Fetcher and Cache System](./docs/en/fetcher-and-cache-system.md) - External HTTP request management with configurable caching strategies for oEmbed APIs and page scraping
- [Built-in Plugins](./docs/en/built-in-plugins.md) - oEmbed, card, and Mermaid plugins for embedding media content, social posts, and interactive diagrams
- [Creating Custom Plugins](./docs/en/creating-custom-plugins.md) - Develop custom plugins to extend Markdown processing with code block interceptors and unified ecosystem integration
- [CLI Application](./docs/en/cli-application.md) - Command-line interface for batch processing Markdown files with configuration support and plugin control

----

## License

Under MIT.

## Changelog

* 0.1.0:
  * First public release.
