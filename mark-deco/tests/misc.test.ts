// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import { describe, it, expect } from 'vitest';
import { defaultProviderList } from '../src/misc';

describe('defaultProviderList', () => {
  it('should expose providers as an array', () => {
    expect(Array.isArray(defaultProviderList)).toBe(true);
    expect(defaultProviderList.length).toBeGreaterThan(0);
  });
});
