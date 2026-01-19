// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import { createRequire } from 'module';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const cjsEntryPath = resolve(process.cwd(), 'dist/index.cjs');
const require = createRequire(cjsEntryPath);

describe('CJS bundle interop', () => {
  it('should apply code highlighting when loaded via require()', async () => {
    const { createMarkdownProcessor, createCachedFetcher } = require(
      cjsEntryPath
    ) as {
      createMarkdownProcessor: (options: { fetcher: unknown }) => {
        process: (
          markdown: string,
          uniqueIdPrefix: string,
          options: Record<string, unknown>
        ) => Promise<{ html: string }>;
      };
      createCachedFetcher: (userAgent: string, timeout?: number) => unknown;
    };

    const processor = createMarkdownProcessor({
      fetcher: createCachedFetcher('mark-deco-test/1.0.0', 5000),
    });

    const markdown = `\`\`\`javascript {1}
console.log('Hello, World!');
\`\`\``;

    const result = await processor.process(markdown, 'id', {
      useContentStringHeaderId: true,
      useHierarchicalHeadingId: false,
      headerTitleTransform: 'none',
      codeHighlight: {
        lineNumbers: true,
      },
    });

    expect(result.html).toContain('data-rehype-pretty-code-figure');
    expect(result.html).toContain('data-line-numbers');
  });
});
