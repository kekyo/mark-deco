## Frontmatter Information Extraction

mark-deco automatically parses "YAML frontmatter" at the beginning of Markdown files and provides it as processing results. Frontmatter is used to describe article metadata (title, author, tags, publication date, etc.).

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

const result = await processor.process(markdown, 'id');

// Access frontmatter data
console.log(result.frontmatter.title); // "Sample Article"
console.log(result.frontmatter.author); // "John Doe"
console.log(result.frontmatter.date); // "2024-01-15"
console.log(result.frontmatter.tags); // ["markdown", "processor"]
console.log(result.frontmatter.published); // true

// Generated HTML doesn't include frontmatter
console.log(result.html); // "<h1 id="id-1">Article Content</h1>..."
```

Frontmatter data can be utilized for:

- Blog article metadata management
- Template engine integration
- Article search and filtering
- SEO information extraction
- Custom rendering logic control

Note: The mark-deco processor itself doesn't use frontmatter information.
Plugins may use this information depending on their implementation.
Frontmatter scalars are parsed with the JSON schema, so you receive JSON-compatible types (`null`, `true`/`false`, numbers, strings).

### Automatic Title Extraction from Base-Level Heading

When the first non-whitespace block in the Markdown body is a base-level heading,
mark-deco applies that heading to `frontmatter.title` by default and removes the heading from the content.
The base level is controlled by `headingBaseLevel` (default: 1).
Control this behaviour with the `headerTitleTransform` option:

- `extractAndRemove` (default): write the base-level heading text into `frontmatter.title` and remove the heading.
- `extract`: write the base-level heading text into `frontmatter.title` but keep the heading in the content.
- `none`: skip title extraction entirely.

If a title already exists in the frontmatter, `extract` or `extractAndRemove` still removes the heading but preserves the existing title.
Disable this behaviour by passing `process(markdown, prefix, { headerTitleTransform: 'none' })`.

For `processWithFrontmatterTransform`, the pre-transform callback runs before this extraction,
so it will not observe the injected title—this is intentional.

### Updating Frontmatter During Processing

When you need to tweak metadata before rendering, use `processor.processWithFrontmatterTransform`.
The function accepts a **pre** transform (third argument) that runs before HTML conversion and an optional **post** transform (fourth argument) that executes after the heading tree is built.
The pre transform receives the parsed frontmatter (by reference), the caller's `uniqueIdPrefix`, and the Markdown body without the frontmatter block.
Return `undefined` from the pre transform to cancel processing altogether, or a `FrontmatterTransformResult` describing the frontmatter and prefix to continue with.

```typescript
const result = await processor.processWithFrontmatterTransform(
  markdown,
  'id',
  async ({ originalFrontmatter, uniqueIdPrefix }) => {
    if (!originalFrontmatter || originalFrontmatter.status !== 'draft') {
      // Cancel processing (skip Markdown -> HTML) when not a draft.
      return undefined;
    }

    return {
      frontmatter: {
        ...originalFrontmatter,
        status: 'published',
        updatedAt: new Date().toISOString(),
      },
      uniqueIdPrefix,
    };
  },
  async ({ frontmatter, headingTree }) => ({
    ...frontmatter,
    headingCount: headingTree.length,
  })
);

if (!result) {
  // The transform returned undefined, so no HTML was generated.
  return;
}

if (result.changed) {
  const updatedMarkdown = result.composeMarkdown();
  // Persist the updated markdown string when metadata changed.
}

// Inspect the actual prefix used after the transform (helpful when overrides apply).
console.log(result.uniqueIdPrefix);
```

Need to tweak rendering flags as well? Pass regular `ProcessOptions` as the final argument.
The pre transform can keep the original metadata by returning `{ frontmatter: originalFrontmatter, uniqueIdPrefix: 'id' }` or swap the prefix entirely.

`result.changed` reports whether the transform altered the metadata. When changes occurred,
`composeMarkdown()` returns a Markdown string whose frontmatter reflects the final state;
otherwise it returns the original input untouched, allowing you to skip unnecessary writes.
`result.uniqueIdPrefix` exposes the prefix actually used for heading IDs after any overrides.
The post transform runs after HTML conversion, receives `{ frontmatter, headingTree }`, and can further refine metadata (return the same reference to indicate no changes).
