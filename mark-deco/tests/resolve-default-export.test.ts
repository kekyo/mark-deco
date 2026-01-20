// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import { describe, it, expect } from 'vitest';
import { resolveDefaultExport } from '../src/utils';

describe('resolveDefaultExport', () => {
  it('should unwrap nested default exports', () => {
    const plugin = () => 'ok';
    const wrapped: any = { default: { default: plugin } };

    expect(resolveDefaultExport(wrapped)).toBe(plugin);
  });

  it('should return default export when present', () => {
    const plugin = () => 'ok';
    const wrapped = { default: plugin };

    expect(resolveDefaultExport(wrapped)).toBe(plugin);
  });

  it('should return module when no default export is present', () => {
    const plugin = () => 'ok';

    expect(resolveDefaultExport(plugin)).toBe(plugin);
  });
});
