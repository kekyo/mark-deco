// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import { dump as dumpYaml, load as loadYaml } from 'js-yaml';
import type { FrontmatterData } from './types.js';

export interface ParsedFrontmatter {
  /** Parsed frontmatter data */
  readonly data: FrontmatterData;
  /** Markdown content without frontmatter */
  readonly content: string;
}

/**
 * Parse frontmatter from markdown content
 * @param content - Raw markdown content with possible frontmatter
 * @returns Parsed frontmatter data and content
 */
export function parseFrontmatter(content: string): ParsedFrontmatter {
  // Regular expression to match frontmatter block
  // Matches: --- at start of line, followed by YAML content, followed by ---
  // The ending --- can be followed by newline or end of string
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    // No frontmatter found, return empty data and original content
    return {
      data: {},
      content,
    };
  }

  const yamlContent = match[1] || '';
  const markdownContent = content.slice(match[0].length);

  try {
    // Parse YAML content using js-yaml
    const parsedData = loadYaml(yamlContent);

    // Ensure we return an object (handle null/undefined cases)
    const data: FrontmatterData =
      parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)
        ? (parsedData as FrontmatterData)
        : {};

    return {
      data,
      content: markdownContent,
    };
  } catch (error) {
    // Re-throw with more descriptive error message
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown YAML parsing error';
    throw new Error(`Failed to parse frontmatter YAML: ${errorMessage}`);
  }
}

/**
 * Convert frontmatter data back into YAML string (excluding delimiters)
 */
export function stringifyFrontmatter(frontmatter: FrontmatterData): string {
  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    return '';
  }

  const yaml = dumpYaml(frontmatter, { lineWidth: 0 });
  if (typeof yaml !== 'string' || yaml.length === 0) {
    return '';
  }

  return yaml.endsWith('\n') ? yaml : `${yaml}\n`;
}

/**
 * Compose markdown from frontmatter data and content
 */
export function composeMarkdownFromParts(
  frontmatter: FrontmatterData,
  content: string
): string {
  const body = content ?? '';
  const yaml = stringifyFrontmatter(frontmatter);

  const frontmatterSection = `${'---'}\n${yaml}${'---'}\n`;
  return `${frontmatterSection}${body}`;
}
