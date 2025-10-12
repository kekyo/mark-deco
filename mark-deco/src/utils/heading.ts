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
