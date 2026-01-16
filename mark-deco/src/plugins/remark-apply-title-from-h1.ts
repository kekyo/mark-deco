// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import type { Heading, Root } from 'mdast';
import type { Position } from 'unist';
import type { Plugin } from 'unified';
import {
  clampHeadingLevel,
  extractHeadingText,
  resolveHeadingBaseLevel,
} from '../utils/heading';
import type { FrontmatterData, HeaderTitleTransform } from '../types';

type ApplyTitleTransform = Exclude<HeaderTitleTransform, 'none'>;

export interface ApplyTitleFromH1Options {
  /** Mutable reference to the frontmatter object */
  readonly frontmatter: FrontmatterData;
  /** Whether frontmatter already contains a title */
  readonly hasTitle: boolean;
  /** How to treat the first base-level heading */
  readonly transform: ApplyTitleTransform;
  /** Base heading level for markdown headings */
  readonly headingBaseLevel: number;
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
  /** Whether the heading was removed from the markdown */
  readonly headingRemoved: boolean;
}

/**
 * Remark plugin that optionally removes the first base-level heading and applies it to frontmatter.title
 */
export const remarkApplyTitleFromH1: Plugin<[ApplyTitleFromH1Options], Root> = (
  options
) => {
  const {
    frontmatter,
    hasTitle,
    transform,
    allowTitleWrite,
    headingBaseLevel,
    onHeadingApplied,
  } = options;
  const shouldRemoveHeading = transform === 'extractAndRemove';
  const baseLevel = resolveHeadingBaseLevel(headingBaseLevel);
  const offset = baseLevel - 1;

  return (tree: Root) => {
    if (!frontmatter || !tree.children || tree.children.length === 0) {
      return;
    }

    let index = 0;
    for (; index < tree.children.length; index++) {
      const node = tree.children[index]!;
      if (node.type === 'heading') {
        const heading = node as Heading;
        const outputLevel = clampHeadingLevel(heading.depth + offset);
        if (outputLevel !== baseLevel) {
          break;
        }
        const nextNode = tree.children[index + 1];
        const nextNodeStartOffset =
          nextNode && nextNode.position
            ? nextNode.position.start?.offset
            : undefined;
        const headingText = extractHeadingText(heading).trim();

        if (shouldRemoveHeading) {
          tree.children.splice(index, 1);
        }

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
            headingRemoved: shouldRemoveHeading,
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

      // First non-heading content encountered -> abort (no leading base-level heading)
      break;
    }
  };
};
