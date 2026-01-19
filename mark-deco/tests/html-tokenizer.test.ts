// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import { describe, it, expect, vi } from 'vitest';
import { rewriteHtmlUrls } from '../src/utils/html-tokenizer';
import type { ResolveUrlContext } from '../src/types';

describe('rewriteHtmlUrls', () => {
  it('returns original html when no url attributes are present', () => {
    const html = '<div class="box">Hello</div>';
    const resolveUrl = vi.fn((url: string) => `/${url}`);

    const result = rewriteHtmlUrls(html, resolveUrl);

    expect(result).toBe(html);
    expect(resolveUrl).not.toHaveBeenCalled();
  });

  it('rewrites href and src attributes with context', () => {
    const html = '<a href="page.html">Link</a><img src="image.png" alt="x">';
    const contexts: ResolveUrlContext[] = [];
    const resolveUrl = vi.fn((url: string, context: ResolveUrlContext) => {
      contexts.push(context);
      return `/${url}`;
    });

    const result = rewriteHtmlUrls(html, resolveUrl);

    expect(result).toBe(
      '<a href="/page.html">Link</a><img src="/image.png" alt="x">'
    );
    expect(contexts).toEqual([
      { kind: 'html', tagName: 'a', attrName: 'href' },
      { kind: 'html', tagName: 'img', attrName: 'src' },
    ]);
  });

  it('rewrites unquoted attributes and srcset values', () => {
    const html = '<img src=photo.jpg srcset="a.jpg 1x, b.jpg 2x">';
    const resolveUrl = vi.fn((url: string) => `/${url}`);

    const result = rewriteHtmlUrls(html, resolveUrl);

    expect(result).toBe('<img src=/photo.jpg srcset="/a.jpg 1x, /b.jpg 2x">');
    expect(resolveUrl).toHaveBeenCalledTimes(3);
  });

  it('does not rewrite raw text contents in script/style tags', () => {
    const html =
      '<script>var src="nope";</script><script src="app.js"></script>';
    const resolveUrl = vi.fn((url: string) => `/${url}`);

    const result = rewriteHtmlUrls(html, resolveUrl);

    expect(result).toBe(
      '<script>var src="nope";</script><script src="/app.js"></script>'
    );
  });

  it('returns original html on malformed quoted attribute', () => {
    const html = '<a href="broken></a>';
    const resolveUrl = vi.fn((url: string) => `/${url}`);

    const result = rewriteHtmlUrls(html, resolveUrl);

    expect(result).toBe(html);
    expect(resolveUrl).not.toHaveBeenCalled();
  });
});
