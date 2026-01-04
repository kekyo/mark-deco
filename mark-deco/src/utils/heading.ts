// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import type { Heading, RootContent, Text, PhrasingContent } from 'mdast';

/**
 * Extract text content from a heading node (flattening inline children)
 */
export const extractHeadingText = (
  node: Heading | RootContent | PhrasingContent | Text | null | undefined
): string => {
  if (!node) {
    return '';
  }

  if ('value' in node && typeof node.value === 'string') {
    return node.value;
  }

  if ('children' in node && Array.isArray(node.children)) {
    return (
      node.children as Array<
        Heading | RootContent | PhrasingContent | Text | null | undefined
      >
    )
      .map((child) => extractHeadingText(child))
      .join('');
  }

  return '';
};

/**
 * Clamp heading level into the range 1-6.
 */
export const clampHeadingLevel = (level: number): number => {
  if (!Number.isFinite(level)) {
    return 1;
  }
  const normalized = Math.trunc(level);
  return Math.min(6, Math.max(1, normalized));
};

/**
 * Resolve heading base level with default and clamp.
 */
export const resolveHeadingBaseLevel = (baseLevel?: number): number => {
  return clampHeadingLevel(baseLevel ?? 1);
};
