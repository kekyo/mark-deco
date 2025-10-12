// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import type { Heading, Root } from 'mdast';
import type { Position } from 'unist';
import type { Plugin } from 'unified';
import { extractHeadingText } from '../utils/heading.js';
import type { FrontmatterData } from '../types.js';

export interface ApplyTitleFromH1Options {
  /** Mutable reference to the frontmatter object */
  readonly frontmatter: FrontmatterData;
  /** Whether frontmatter already contains a title */
  readonly hasTitle: boolean;
  /** Whether plugin is allowed to write extracted title into frontmatter */
  readonly allowTitleWrite: boolean;
  /** Callback invoked when a heading was removed */
  readonly onHeadingApplied?: (info: ApplyTitleFromH1Result) => void;
}

export interface ApplyTitleFromH1Result {
  /** Extracted text from the removed heading */
  readonly headingText: string;
  /** Position of the removed heading in the original markdown */
  readonly position: Position | undefined;
  /** Offset of the next content node following the removed heading */
  readonly nextNodeStartOffset: number | undefined;
  /** Whether the heading text was written into frontmatter.title */
  readonly titleWritten: boolean;
}

/**
 * Remark plugin that removes the first H1 heading and optionally applies it to frontmatter.title
 */
export const remarkApplyTitleFromH1: Plugin<[ApplyTitleFromH1Options], Root> = (
  options
) => {
  const { frontmatter, hasTitle, allowTitleWrite, onHeadingApplied } = options;

  return (tree: Root) => {
    if (!frontmatter || !tree.children || tree.children.length === 0) {
      return;
    }

    let index = 0;
    for (; index < tree.children.length; index++) {
      const node = tree.children[index]!;
      if (node.type === 'heading' && (node as Heading).depth === 1) {
        const heading = node as Heading;
        const nextNode = tree.children[index + 1];
        const nextNodeStartOffset =
          nextNode && nextNode.position
            ? nextNode.position.start?.offset
            : undefined;
        const headingText = extractHeadingText(heading).trim();

        tree.children.splice(index, 1);

        let titleWritten = false;
        if (!hasTitle && allowTitleWrite && headingText.length > 0) {
          (frontmatter as Record<string, unknown>).title = headingText;
          titleWritten = true;
        }

        if (onHeadingApplied) {
          onHeadingApplied({
            headingText,
            position: heading.position,
            nextNodeStartOffset,
            titleWritten,
          });
        }

        break;
      }

      if (
        node.type === 'thematicBreak' ||
        (node.type === 'html' &&
          typeof (node as any).value === 'string' &&
          (node as any).value.trim() === '')
      ) {
        continue;
      }

      if (node.type === 'paragraph' && (node as any).children?.length === 0) {
        continue;
      }

      // First non-heading content encountered -> abort (no leading H1)
      break;
    }
  };
};
