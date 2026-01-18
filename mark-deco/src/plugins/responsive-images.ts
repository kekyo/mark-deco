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
  /** Default CSS class name(s) to apply to the parent paragraph of images (space-separated). */
  defaultOuterClassName?: string;
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

const getNodeClassList = (node: Element): string[] => {
  if (!node.properties) {
    return [];
  }

  return normalizeClassList(
    (node.properties.className ?? node.properties.class) as unknown
  );
};

const setNodeClassList = (node: Element, classList: string[]) => {
  if (!node.properties) {
    node.properties = {};
  }

  if (classList.length === 0) {
    if ('className' in node.properties) {
      delete (node.properties as Record<string, unknown>).className;
    }
    if ('class' in node.properties) {
      delete (node.properties as Record<string, unknown>).class;
    }
    return;
  }

  node.properties.className = classList;
  if ('class' in node.properties) {
    delete (node.properties as Record<string, unknown>).class;
  }
};

const collectImageNodes = (node: Element): Element[] => {
  const images: Element[] = [];
  const stack = [...(node.children ?? [])];

  while (stack.length > 0) {
    const child = stack.pop();
    if (!child || child.type !== 'element') {
      continue;
    }

    if (child.tagName === 'img') {
      images.push(child);
      continue;
    }

    if (child.children && child.children.length > 0) {
      stack.push(...child.children);
    }
  }

  return images;
};

/**
 * Rehype plugin that adds responsive styles to all img tags
 * This plugin processes the HTML AST and adds inline styles to img elements
 * to make them responsive while preserving aspect ratio
 */
export const rehypeResponsiveImages = (
  options: ResponsiveImageOptions = {}
) => {
  const defaultOuterClassList = normalizeClassList(
    options.defaultOuterClassName
  );

  return (tree: any) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'p') {
        const imageNodes = collectImageNodes(node);
        if (imageNodes.length > 0) {
          let imageClassList: string[] = [];
          for (const imageNode of imageNodes) {
            imageClassList = mergeClassLists(
              imageClassList,
              getNodeClassList(imageNode)
            );
          }

          const mergedClassList = mergeClassLists(
            getNodeClassList(node),
            mergeClassLists(imageClassList, defaultOuterClassList)
          );
          if (mergedClassList.length > 0) {
            setNodeClassList(node, mergedClassList);
          }

          for (const imageNode of imageNodes) {
            setNodeClassList(imageNode, []);
          }
        }
      }

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
      }
    });
  };
};
