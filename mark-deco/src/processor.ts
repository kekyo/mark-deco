// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import beautify from 'js-beautify';
import type { HTMLBeautifyOptions } from 'js-beautify';
import rehypeStringifyPlugin from 'rehype-stringify';
import remarkGfmPlugin from 'remark-gfm';
import remarkParsePlugin from 'remark-parse';
import remarkRehypePlugin from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

import { composeMarkdownFromParts, parseFrontmatter } from './frontmatter';
import { getNoOpLogger } from './logger';
import { escapeHtml } from './plugins/oembed/utils';
import {
  createCodeHighlightRehypePlugin,
  remarkProtectCodeMeta,
} from './plugins/code-highlight';
import { remarkAttr } from './plugins/remark-attr';
import { rehypeResponsiveImages } from './plugins/responsive-images';
import { rewriteHtmlUrls } from './utils/html-tokenizer';
import { generateHeadingId } from './utils';
import { applyTitleFromH1 } from './apply-title-from-h1';
import {
  clampHeadingLevel,
  extractHeadingText,
  resolveHeadingBaseLevel,
} from './utils/heading';
import type {
  MarkdownProcessorPlugin,
  MarkdownProcessorPluginContext,
  MarkdownProcessor,
  MarkdownProcessorOptions,
  ProcessOptions,
  ProcessResult,
  FrontmatterData,
  HeadingNode,
  FrontmatterPreTransformContext,
  FrontmatterPostTransformContext,
  ProcessResultWithFrontmatterTransform,
  ProcessWithFrontmatterTransformOptions,
} from './types';

const { html: beautifyHtml } = beautify;
type ResolveUrl = NonNullable<ProcessOptions['resolveUrl']>;

/**
 * Default HTML beautify options with improved div structure handling
 * These are used as fallback when htmlOptions is not provided in advancedOptions
 */
export const defaultHtmlOptions: HTMLBeautifyOptions = {
  indent_size: 2,
  indent_char: ' ',
  max_preserve_newlines: 2,
  preserve_newlines: true,
  end_with_newline: false,
  wrap_line_length: 0,
  indent_inner_html: true,
  indent_empty_lines: false,
  unformatted: ['code', 'pre', 'textarea'],
  content_unformatted: ['pre', 'code', 'textarea'],
  extra_liners: [],
} as const;

const normalizeFrontmatterValue = (value: unknown): unknown => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(normalizeFrontmatterValue);
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, inner]) => inner !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const normalized: Record<string, unknown> = {};
    for (const [key, inner] of entries) {
      normalized[key] = normalizeFrontmatterValue(inner);
    }
    return normalized;
  }
  return value;
};

const snapshotFrontmatter = (data: FrontmatterData): string => {
  return JSON.stringify(normalizeFrontmatterValue(data ?? {}));
};

/**
 * Generate hierarchical ID from heading number array
 */
const generateHierarchicalId = (prefix: string, numbers: number[]): string => {
  return `${prefix}-${numbers.join('-')}`;
};

/**
 * Build hierarchical heading numbers
 */
const buildHierarchicalNumbers = (
  headings: Array<{ level: number; text: string }>,
  headingBaseLevel: number
): Array<{ level: number; text: string; numbers: number[] }> => {
  const result: Array<{ level: number; text: string; numbers: number[] }> = [];
  const stack: number[] = []; // Track numbers at each level
  const baseLevel = resolveHeadingBaseLevel(headingBaseLevel);

  for (const heading of headings) {
    const level = Math.max(1, heading.level - baseLevel + 1);

    // Adjust stack size to current level
    // If we're going to a higher level (smaller number), remove deeper levels
    while (stack.length > level) {
      stack.pop();
    }
    // If we're going to a deeper level, add zeros for intermediate levels
    while (stack.length < level) {
      stack.push(0);
    }

    // Increment the number at current level
    const currentIndex = level - 1;
    stack[currentIndex] = (stack[currentIndex] || 0) + 1;

    // Create a copy of current numbers for this heading (only up to current level)
    const numbers = stack.slice(0, level);

    result.push({
      level: heading.level,
      text: heading.text,
      numbers,
    });
  }

  return result;
};

/**
 * Generate ID from heading text with fallback strategy (internal use)
 */
const generateHeadingIdInternal = (
  prefix: string,
  text: string,
  fallbackId: () => string
): string => {
  const result = generateHeadingId(text);
  if (result !== undefined) {
    return `${prefix}-${result}`;
  } else {
    return fallbackId();
  }
};

/**
 * Build heading tree from flat list of headings
 */
const buildHeadingTree = (
  headings: Array<{ level: number; text: string; id: string }>
): HeadingNode[] => {
  const tree: HeadingNode[] = [];
  const stack: HeadingNode[] = [];

  for (const heading of headings) {
    const node: HeadingNode = {
      level: heading.level,
      text: heading.text,
      id: heading.id,
      children: [],
    };

    // Find the correct parent level
    while (stack.length > 0) {
      const lastItem = stack[stack.length - 1];
      if (lastItem && lastItem.level >= heading.level) {
        stack.pop();
      } else {
        break;
      }
    }

    if (stack.length === 0) {
      // Top-level heading
      tree.push(node);
    } else {
      // Child heading
      const parent = stack[stack.length - 1];
      if (parent) {
        parent.children.push(node);
      }
    }

    stack.push(node);
  }

  return tree;
};

/**
 * Creates a markdown processor with plugin support
 * @param options - Configuration options for the markdown processor
 * @returns A configured markdown processor instance
 */
export const createMarkdownProcessor = (
  options: MarkdownProcessorOptions
): MarkdownProcessor => {
  const { plugins = [], logger = getNoOpLogger(), fetcher } = options;

  const pluginsMap: Map<string, MarkdownProcessorPlugin> = new Map();

  // Initialize plugins
  for (const plugin of plugins) {
    if (pluginsMap.has(plugin.name)) {
      throw new Error(
        `Plugin with name '${plugin.name}' is already registered`
      );
    }
    pluginsMap.set(plugin.name, plugin);
  }

  /**
   * Process a code block with the appropriate plugin
   */
  const processBlock = async (
    language: string,
    content: string,
    context: MarkdownProcessorPluginContext
  ): Promise<string> => {
    const plugin = pluginsMap.get(language);

    if (!plugin) {
      // Return original code block if no plugin found
      return `<pre><code class="language-${language}">${escapeHtml(content)}</code></pre>`;
    }

    return await plugin.processBlock(content, context);
  };

  /**
   * Create a remark plugin for processing custom code blocks
   */
  const createCustomBlockPlugin = (
    frontmatter: FrontmatterData,
    signal: AbortSignal | undefined,
    getUniqueId: () => string
  ) => {
    const context: MarkdownProcessorPluginContext = {
      logger,
      signal,
      frontmatter,
      getUniqueId,
      fetcher,
    };

    return () => {
      return async (tree: any) => {
        const promises: Promise<void>[] = [];

        visit(
          tree,
          'code',
          (node: any, index: number | undefined, parent: any) => {
            if (!node.lang || !pluginsMap.has(node.lang)) {
              return;
            }

            const promise = (async () => {
              const processedHtml = await processBlock(
                node.lang,
                node.value,
                context
              );

              // Replace the code node with an HTML node
              const htmlNode = {
                type: 'html',
                value: processedHtml,
              };

              if (parent && typeof index === 'number') {
                parent.children[index] = htmlNode;
              }
            })();

            promises.push(promise);
          }
        );

        // Wait for all plugin processing to complete
        await Promise.all(promises);
      };
    };
  };

  /**
   * Create a remark plugin for resolving URLs
   */
  const createResolveUrlPlugin = (resolveUrl: ResolveUrl) => {
    return () => {
      return (tree: any) => {
        visit(tree, (node: any) => {
          if (!node) {
            return;
          }
          if (node.type === 'link' && typeof node.url === 'string') {
            node.url = resolveUrl(node.url, { kind: 'link' });
            return;
          }
          if (node.type === 'image' && typeof node.url === 'string') {
            node.url = resolveUrl(node.url, { kind: 'image' });
            return;
          }
          if (node.type === 'definition' && typeof node.url === 'string') {
            node.url = resolveUrl(node.url, { kind: 'definition' });
            return;
          }
          if (node.type === 'html' && typeof node.value === 'string') {
            node.value = rewriteHtmlUrls(node.value, resolveUrl);
          }
        });
      };
    };
  };

  /**
   * Create a remark plugin for building heading tree and setting IDs
   */
  const createHeadingTreePlugin = (
    headingTree: HeadingNode[],
    generateId: (headingText: string) => string,
    useHierarchicalId: boolean = false,
    useContentBasedId: boolean = false,
    uniqueIdPrefix: string = '',
    headingBaseLevel: number = 1
  ) => {
    return () => {
      return (tree: any) => {
        const headings: Array<{ level: number; text: string; id: string }> = [];
        const baseLevel = resolveHeadingBaseLevel(headingBaseLevel);
        const offset = baseLevel - 1;
        const resolveAdjustedLevel = (depth: number): number => {
          return clampHeadingLevel(depth + offset);
        };

        // First pass: collect all headings
        const headingNodes: Array<{ node: any; level: number }> = [];
        visit(tree, 'heading', (node: any) => {
          if (node.depth >= 1 && node.depth <= 6) {
            const adjustedLevel = resolveAdjustedLevel(node.depth);
            if (!node.data) {
              node.data = {};
            }
            node.data.hName = `h${adjustedLevel}`;
            headingNodes.push({ node, level: adjustedLevel });
          }
        });

        // Generate hierarchical numbers if requested
        let hierarchicalNumbers: Array<{
          level: number;
          text: string;
          numbers: number[];
        }> = [];
        if (useHierarchicalId) {
          const basicHeadings = headingNodes.map(({ node, level }) => ({
            level,
            text: extractHeadingText(node),
          }));
          hierarchicalNumbers = buildHierarchicalNumbers(
            basicHeadings,
            baseLevel
          );
        }

        // Second pass: set IDs and collect heading data
        const parentContentIds: Array<{ level: number; contentId: string }> =
          [];

        headingNodes.forEach(({ node, level }, index) => {
          const headingText = extractHeadingText(node);

          // Check if ID is already set by remark-attr
          const existingId = node.data?.hProperties?.id;
          let headingId: string;

          if (existingId) {
            headingId = existingId;
          } else if (useHierarchicalId && useContentBasedId) {
            // Both hierarchical and content-based: create hierarchical content IDs
            const contentBasedId = generateHeadingIdInternal(
              uniqueIdPrefix,
              headingText,
              () => generateId(headingText)
            ).replace(`${uniqueIdPrefix}-`, '');

            // Remove parent IDs that are deeper than current level
            while (parentContentIds.length > 0) {
              const lastParent = parentContentIds[parentContentIds.length - 1];
              if (lastParent && lastParent.level >= level) {
                parentContentIds.pop();
              } else {
                break;
              }
            }

            // Build hierarchical content ID
            const parentParts = parentContentIds.map((p) => p.contentId);
            const hierarchicalContentId =
              parentParts.length > 0
                ? `${uniqueIdPrefix}-${parentParts.join('-')}-${contentBasedId}`
                : `${uniqueIdPrefix}-${contentBasedId}`;

            headingId = hierarchicalContentId;

            // Store this heading's content ID for children
            parentContentIds.push({
              level,
              contentId: contentBasedId,
            });
          } else if (useHierarchicalId && index < hierarchicalNumbers.length) {
            const hierarchicalData = hierarchicalNumbers[index];
            if (hierarchicalData) {
              headingId = generateHierarchicalId(
                uniqueIdPrefix,
                hierarchicalData.numbers
              );
            } else {
              headingId = generateId(headingText);
            }
          } else {
            headingId = generateId(headingText);
          }

          // Set the ID on the node for later use by rehype
          if (!node.data) {
            node.data = {};
          }
          if (!node.data.hProperties) {
            node.data.hProperties = {};
          }
          if (!existingId) {
            node.data.hProperties.id = headingId;
          }

          headings.push({
            level,
            text: headingText,
            id: headingId,
          });
        });

        // Build the tree and populate the provided array
        const builtTree = buildHeadingTree(headings);
        headingTree.push(...builtTree);
      };
    };
  };

  const handleProcessingError = (error: unknown): never => {
    logger.error(
      `Failed to process markdown: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
    throw new Error(
      `Failed to process markdown: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  };

  const processCore = async (
    markdown: string,
    uniqueIdPrefix: string,
    options: ProcessOptions | undefined,
    frontmatter: FrontmatterData,
    content: string,
    changed: boolean
  ): Promise<ProcessResultWithFrontmatterTransform> => {
    const {
      signal,
      useContentStringHeaderId = false,
      useHierarchicalHeadingId = true,
      headingBaseLevel,
      defaultImageOuterClassName,
      codeHighlight,
      resolveUrl,
      advancedOptions,
    } = options ?? {};
    const resolvedHeadingBaseLevel = resolveHeadingBaseLevel(headingBaseLevel);
    const hasCodeHighlight = codeHighlight !== undefined;

    const {
      allowDangerousHtml = true,
      htmlOptions = defaultHtmlOptions,
      gfmOptions = {},
      remarkPlugins = [],
      rehypePlugins = [],
    } = advancedOptions || {};

    const headingTree: HeadingNode[] = [];

    let idCounter = 0;
    const getUniqueId = (): string => {
      const id = `${uniqueIdPrefix}-${++idCounter}`;
      return id;
    };

    let processor0 = unified().use(remarkParsePlugin);

    if (remarkPlugins) {
      for (const plugin of remarkPlugins) {
        if (Array.isArray(plugin)) {
          processor0 = processor0.use(plugin[0], plugin[1]);
        } else {
          processor0 = processor0.use(plugin as any);
        }
      }
    }

    if (hasCodeHighlight) {
      processor0 = processor0.use(remarkProtectCodeMeta);
    }

    const responsiveImageOptions =
      defaultImageOuterClassName === undefined
        ? undefined
        : { defaultOuterClassName: defaultImageOuterClassName };

    let processor: any = processor0
      .use(remarkGfmPlugin, gfmOptions)
      .use(remarkAttr)
      .use(
        createHeadingTreePlugin(
          headingTree,
          useContentStringHeaderId
            ? (text) =>
                generateHeadingIdInternal(uniqueIdPrefix, text, getUniqueId)
            : getUniqueId,
          useHierarchicalHeadingId,
          useContentStringHeaderId,
          uniqueIdPrefix,
          resolvedHeadingBaseLevel
        )
      )
      .use(createCustomBlockPlugin(frontmatter, signal, getUniqueId));

    if (resolveUrl) {
      processor = processor.use(createResolveUrlPlugin(resolveUrl));
    }

    processor = processor
      .use(remarkRehypePlugin, { allowDangerousHtml })
      .use(rehypeResponsiveImages, responsiveImageOptions)
      .use(rehypeStringifyPlugin, { allowDangerousHtml });

    if (hasCodeHighlight) {
      const [plugin, options] = createCodeHighlightRehypePlugin(codeHighlight);
      processor = processor.use(plugin, options);
    }

    if (rehypePlugins) {
      for (const plugin of rehypePlugins) {
        if (Array.isArray(plugin)) {
          processor = processor.use(plugin[0], plugin[1]);
        } else {
          processor = processor.use(plugin as any);
        }
      }
    }

    const result = await processor.process(content);
    const rehypedHtml = String(result);
    const formattedHtml = beautifyHtml(rehypedHtml, htmlOptions);

    const composeMarkdown = (): string => {
      if (!changed) {
        return markdown;
      }
      return composeMarkdownFromParts(frontmatter, content);
    };

    return {
      html: formattedHtml,
      frontmatter,
      changed,
      headingTree,
      composeMarkdown,
      uniqueIdPrefix,
    };
  };

  /**
   * Process markdown content without frontmatter transform
   */
  const process = async (
    markdown: string,
    uniqueIdPrefix: string,
    options: ProcessOptions = {}
  ): Promise<ProcessResult> => {
    try {
      const { data: parsedFrontmatter, content } = parseFrontmatter(markdown);

      const resolvedHeadingBaseLevel = resolveHeadingBaseLevel(
        options.headingBaseLevel
      );
      const titleTransform = options.headerTitleTransform ?? 'extractAndRemove';
      let workingContent = content;
      let contentChanged = false;
      let frontmatterChanged = false;

      if (titleTransform !== 'none') {
        const h1Result = applyTitleFromH1(workingContent, parsedFrontmatter, {
          allowTitleWrite: true,
          transform: titleTransform,
          headingBaseLevel: resolvedHeadingBaseLevel,
        });
        workingContent = h1Result.content;
        contentChanged = h1Result.headingRemoved;
        frontmatterChanged = h1Result.titleWritten;
      }

      const changed = contentChanged || frontmatterChanged;

      const normalizedOptions: ProcessOptions = {
        ...options,
        headingBaseLevel: resolvedHeadingBaseLevel,
      };

      return await processCore(
        markdown,
        uniqueIdPrefix,
        normalizedOptions,
        parsedFrontmatter,
        workingContent,
        changed
      );
    } catch (error) {
      return handleProcessingError(error);
    }
  };

  /**
   * Process markdown content with frontmatter transform
   */
  const processWithFrontmatterTransform = async (
    markdown: string,
    uniqueIdPrefix: string,
    options: ProcessWithFrontmatterTransformOptions
  ): Promise<ProcessResultWithFrontmatterTransform | undefined> => {
    try {
      const { data: parsedFrontmatter, content } = parseFrontmatter(markdown);
      const originalSnapshot = snapshotFrontmatter(parsedFrontmatter);

      const preContext: FrontmatterPreTransformContext = {
        originalFrontmatter: parsedFrontmatter,
        markdownContent: content,
        uniqueIdPrefix,
      };

      const transformed = await options.preTransform(preContext);
      if (transformed === undefined) {
        return undefined;
      }

      const {
        frontmatter,
        uniqueIdPrefix: overrideUniqueIdPrefix,
        headerTitleTransform,
      } = transformed;
      const nextUniqueIdPrefix = overrideUniqueIdPrefix ?? uniqueIdPrefix;

      const resolvedHeadingBaseLevel = resolveHeadingBaseLevel(
        options.headingBaseLevel
      );
      const titleTransform = headerTitleTransform ?? 'extractAndRemove';
      let workingContent = content;
      let contentChanged = false;

      if (titleTransform !== 'none') {
        const h1Result = applyTitleFromH1(workingContent, frontmatter, {
          allowTitleWrite: true,
          transform: titleTransform,
          headingBaseLevel: resolvedHeadingBaseLevel,
        });
        workingContent = h1Result.content;
        contentChanged = h1Result.headingRemoved || contentChanged;
      }

      const preSnapshot = snapshotFrontmatter(frontmatter);
      const preChanged = preSnapshot !== originalSnapshot || contentChanged;

      const normalizedOptions: ProcessWithFrontmatterTransformOptions = {
        ...options,
        headingBaseLevel: resolvedHeadingBaseLevel,
      };

      const baseResult = await processCore(
        markdown,
        nextUniqueIdPrefix,
        normalizedOptions,
        frontmatter,
        workingContent,
        preChanged
      );

      let finalFrontmatter = baseResult.frontmatter;

      if (options.postTransform) {
        const postContext: FrontmatterPostTransformContext = {
          frontmatter: finalFrontmatter,
          headingTree: baseResult.headingTree,
        };
        const postTransformed = await options.postTransform(postContext);
        finalFrontmatter = postTransformed;
      }

      const finalSnapshot = snapshotFrontmatter(finalFrontmatter);
      const finalChanged = finalSnapshot !== originalSnapshot || contentChanged;

      const composeMarkdown = (): string => {
        if (!finalChanged) {
          return markdown;
        }
        return composeMarkdownFromParts(finalFrontmatter, workingContent);
      };

      return {
        html: baseResult.html,
        frontmatter: finalFrontmatter,
        changed: finalChanged,
        headingTree: baseResult.headingTree,
        composeMarkdown,
        uniqueIdPrefix: baseResult.uniqueIdPrefix,
      };
    } catch (error) {
      return handleProcessingError(error);
    }
  };

  return {
    process,
    processWithFrontmatterTransform,
  };
};
