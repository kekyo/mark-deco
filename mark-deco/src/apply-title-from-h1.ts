// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { remarkApplyTitleFromH1 } from './plugins/remark-apply-title-from-h1.js';
import type { FrontmatterData } from './types.js';

export interface ApplyTitleOptions {
  /** Whether the caller allows writing heading text into frontmatter.title */
  readonly allowTitleWrite: boolean;
}

export interface ApplyTitleResult {
  readonly content: string;
  readonly headingRemoved: boolean;
  readonly titleWritten: boolean;
}

/**
 * Apply the leading H1 heading to frontmatter.title and remove it from the markdown content
 */
export const applyTitleFromH1 = (
  markdownContent: string,
  frontmatter: FrontmatterData,
  options: ApplyTitleOptions
): ApplyTitleResult => {
  const hasTitle =
    frontmatter !== undefined &&
    frontmatter !== null &&
    Object.prototype.hasOwnProperty.call(frontmatter, 'title') &&
    (frontmatter as Record<string, unknown>).title !== undefined &&
    (frontmatter as Record<string, unknown>).title !== null;

  let headingRemoved = false;
  let titleWritten = false;
  let removeStartOffset: number | undefined;
  let removeEndOffset: number | undefined;

  const runner = unified()
    .use(remarkParse)
    .use(remarkApplyTitleFromH1, {
      frontmatter,
      hasTitle,
      allowTitleWrite: options.allowTitleWrite,
      onHeadingApplied: (info) => {
        headingRemoved = true;
        titleWritten = info.titleWritten;
        const startOffset = info.position?.start?.offset ?? 0;
        let endOffset = info.position?.end?.offset ?? startOffset;

        if (
          typeof info.nextNodeStartOffset === 'number' &&
          info.nextNodeStartOffset >= endOffset
        ) {
          endOffset = info.nextNodeStartOffset;
        } else {
          endOffset = markdownContent.length;
        }

        removeStartOffset = startOffset;
        removeEndOffset = endOffset;
      },
    });

  const tree = runner.parse(markdownContent);
  runner.runSync(tree);

  if (
    headingRemoved &&
    removeStartOffset !== undefined &&
    removeEndOffset !== undefined
  ) {
    const updatedContent =
      markdownContent.slice(0, removeStartOffset) +
      markdownContent.slice(removeEndOffset);
    return {
      content: updatedContent,
      headingRemoved: true,
      titleWritten,
    };
  }

  return {
    content: markdownContent,
    headingRemoved: false,
    titleWritten: false,
  };
};
