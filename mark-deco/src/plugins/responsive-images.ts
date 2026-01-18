// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

/**
 * Rehype plugin to make standard markdown images responsive
 */
import { visit } from 'unist-util-visit';
import { generateResponsiveImageStyles } from '../utils/responsive-image';
import type { Element } from 'hast';

export interface ResponsiveImageOptions {
  /** Default CSS class name(s) to apply to all img elements (space-separated). */
  defaultClassName?: string;
}

const normalizeClassList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .flatMap((item) => item.split(/\s+/))
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(/\s+/).filter(Boolean);
  }
  return [];
};

const mergeClassLists = (existing: string[], extra: string[]): string[] => {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const value of [...existing, ...extra]) {
    if (!seen.has(value)) {
      seen.add(value);
      merged.push(value);
    }
  }

  return merged;
};

/**
 * Rehype plugin that adds responsive styles to all img tags
 * This plugin processes the HTML AST and adds inline styles to img elements
 * to make them responsive while preserving aspect ratio
 */
export const rehypeResponsiveImages = (
  options: ResponsiveImageOptions = {}
) => {
  const defaultClassList = normalizeClassList(options.defaultClassName);

  return (tree: any) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'img') {
        const responsiveStyles = generateResponsiveImageStyles();

        // Initialize properties object if it doesn't exist
        if (!node.properties) {
          node.properties = {};
        }

        // Get existing style attribute if any
        const existingStyle = (node.properties.style as string) || '';

        // Combine existing styles with responsive styles
        const combinedStyles = existingStyle
          ? `${existingStyle}; ${responsiveStyles}`
          : responsiveStyles;

        // Set the combined styles
        node.properties.style = combinedStyles;

        if (defaultClassList.length > 0) {
          const existingClassList = normalizeClassList(
            (node.properties.className ?? node.properties.class) as unknown
          );
          const mergedClassList = mergeClassLists(
            existingClassList,
            defaultClassList
          );
          if (mergedClassList.length > 0) {
            node.properties.className = mergedClassList;
            if ('class' in node.properties) {
              delete (node.properties as Record<string, unknown>).class;
            }
          }
        }
      }
    });
  };
};
