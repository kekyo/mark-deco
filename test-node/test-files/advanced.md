---
title: 'Advanced Features Test'
author: 'Test Suite'
date: 2024-01-02
tags: ['advanced', 'test', 'features']
category: 'testing'
published: true
---

# Advanced Features Test

This file tests advanced features of the MarkDeco.

## Complex Frontmatter

The frontmatter above includes various data types:

- String values
- Array values
- Boolean values
- Date values

## Multiple Headers

### Subsection 1

Content for subsection 1 with **bold text** and _italic text_.

#### Deep Nesting Level 4

This is level 4 header content.

##### Even Deeper Level 5

This is level 5 header content.

### Subsection 2

Content for subsection 2 with `inline code` and [a link](https://example.com).

# Second Main Section

This is another main section with more complex content.

## Advanced Markdown Features

### Code Block with Language

```python
def hello_world():
    print("Hello, World!")
    return "success"

# This is a comment
result = hello_world()
```

### Complex Table

| Feature     | Status      | Priority | Notes               |
| ----------- | ----------- | -------- | ------------------- |
| Frontmatter | ✅ Complete | High     | YAML parsing        |
| Headers     | ✅ Complete | High     | H1-H6 support       |
| Code Blocks | ✅ Complete | Medium   | Syntax highlighting |
| Tables      | ✅ Complete | Medium   | GFM style           |
| Links       | ✅ Complete | Low      | Internal/external   |

### Mixed Content Lists

1. **First item** with _emphasis_
   - Nested unordered item
   - Another nested item with `code`
2. **Second item** with [link](https://example.com)
   1. Nested ordered item
   2. Another nested ordered item
3. **Third item** with complex content:

   This is a paragraph within a list item.

   ```javascript
   console.log('Code within list');
   ```

# Third Main Section

Final section for testing H1 extraction with advanced content.

## Blockquotes and Citations

> This is a simple blockquote.

> This is a multi-line blockquote.
> It spans multiple lines and can contain **bold text**,
> _italic text_, and even `inline code`.

> ### Quote with Header
>
> Blockquotes can also contain headers and other markdown elements.
>
> - List item in quote
> - Another list item

## Summary

This file comprehensively tests:

- Complex frontmatter parsing with multiple data types
- Multiple H1 elements for extraction testing
- Advanced markdown features (nested lists, complex tables, code blocks)
- Text formatting within various contexts
- Blockquotes with rich content
- Deep header nesting (H1-H5)

All content is deterministic and produces stable output.
