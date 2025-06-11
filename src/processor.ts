import beautifyPkg from 'js-beautify';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { parseFrontmatter } from './frontmatter.js';
import { getNoOpLogger } from './logger.js';
import { escapeHtml } from './plugins/oembed/utils.js';
import { remarkAttr } from './plugins/remark-attr.js';
import { rehypeResponsiveImages } from './plugins/responsive-images.js';
import type {
  Plugin,
  PluginContext,
  MarkdownProcessor,
  MarkdownProcessorOptions,
  ProcessOptions,
  ProcessResult,
  FrontmatterData,
  HeadingNode
} from './types.js';
import type { HTMLBeautifyOptions } from 'js-beautify';

const { html: beautifyHtml } = beautifyPkg;

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
  extra_liners: []
} as const;

/**
 * Extract text content from heading node
 */
const extractHeadingText = (node: any): string => { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (node.type === 'text') {
    return node.value || '';
  }
  if (node.type === 'inlineCode') {
    return node.value || '';
  }
  if (node.children && Array.isArray(node.children)) {
    return node.children.map(extractHeadingText).join('');
  }
  return '';
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
const buildHierarchicalNumbers = (headings: Array<{ level: number; text: string }>): Array<{ level: number; text: string; numbers: number[] }> => {
  const result: Array<{ level: number; text: string; numbers: number[] }> = [];
  const stack: number[] = []; // Track numbers at each level

  for (const heading of headings) {
    const level = heading.level;

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
      numbers
    });
  }

  return result;
};

/**
 * Generate ID from heading text with fallback strategy
 */
const generateHeadingId = (prefix: string, text: string, fallbackId: () => string): string => {
  // Step 1: Unicode normalization and accent removal
  let processed = text
    .normalize('NFD')                       // Unicode normalization (decomposition)
    .replace(/[\u0300-\u036f]/g, '')        // Remove combining characters (accents, etc.)
    .toLowerCase()
    .replace(/\\[nrtbfv0]/g, '-')           // Replace escape sequence strings with hyphens
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '-'); // Replace actual control characters with hyphens

  // Step 2: Extract ASCII characters only
  const asciiOnly = processed.replace(/[^\x20-\x7E]/g, '');

  // Step 3: Generate valid ID from ASCII characters
  const finalId = asciiOnly
    .replace(/[^\w\s-]/g, '')               // Remove non-word characters except spaces and hyphens
    .replace(/\s+/g, '-')                   // Replace spaces with hyphens
    .replace(/-+/g, '-')                    // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '');                 // Remove leading/trailing hyphens

  // Step 4: Use fallback if valid ID cannot be created (minimum 3 characters)
  if (finalId.length >= 3) {
    return `${prefix}-${finalId}`;
  } else {
    return fallbackId();
  }
};

/**
 * Build heading tree from flat list of headings
 */
const buildHeadingTree = (headings: Array<{ level: number; text: string; id: string }>): HeadingNode[] => {
  const tree: HeadingNode[] = [];
  const stack: HeadingNode[] = [];

  for (const heading of headings) {
    const node: HeadingNode = {
      level: heading.level,
      text: heading.text,
      id: heading.id,
      children: []
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
export const createMarkdownProcessor = (options: MarkdownProcessorOptions): MarkdownProcessor => {
  const {
    plugins = [],
    logger = getNoOpLogger(),
    fetcher
  } = options;

  const pluginsMap: Map<string, Plugin> = new Map();

  // Initialize plugins
  for (const plugin of plugins) {
    if (pluginsMap.has(plugin.name)) {
      throw new Error(`Plugin with name '${plugin.name}' is already registered`);
    }
    pluginsMap.set(plugin.name, plugin);
  }

  /**
   * Process a code block with the appropriate plugin
   */
  const processBlock = async (
    language: string,
    content: string,
    context: PluginContext
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
  const createCustomBlockPlugin = (frontmatter: FrontmatterData, signal: AbortSignal | undefined, getUniqueId: () => string) => {
    const context: PluginContext = {
      logger,
      signal,
      frontmatter,
      getUniqueId,
      fetcher,
    };

    return () => {
      return async (tree: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const promises: Promise<void>[] = [];

        visit(tree, 'code', (node: any, index: number | undefined, parent: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
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
              value: processedHtml
            };

            if (parent && typeof index === 'number') {
              parent.children[index] = htmlNode;
            }
          })();

          promises.push(promise);
        });

        // Wait for all plugin processing to complete
        await Promise.all(promises);
      };
    };
  };

  /**
   * Create a remark plugin for building heading tree and setting IDs
   */
  const createHeadingTreePlugin = (
    headingTree: HeadingNode[],
    generateHeadingId: (headingText: string) => string,
    useHierarchicalId: boolean = false,
    useContentBasedId: boolean = false,
    uniqueIdPrefix: string = ''
  ) => {
    return () => {
      return (tree: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const headings: Array<{ level: number; text: string; id: string }> = [];

        // First pass: collect all headings
        const headingNodes: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
        visit(tree, 'heading', (node: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          if (node.depth >= 1 && node.depth <= 6) {
            headingNodes.push(node);
          }
        });

        // Generate hierarchical numbers if requested
        let hierarchicalNumbers: Array<{ level: number; text: string; numbers: number[] }> = [];
        if (useHierarchicalId) {
          const basicHeadings = headingNodes.map(node => ({
            level: node.depth,
            text: extractHeadingText(node)
          }));
          hierarchicalNumbers = buildHierarchicalNumbers(basicHeadings);
        }

        // Second pass: set IDs and collect heading data
        const parentContentIds: Array<{ level: number; contentId: string }> = [];

        headingNodes.forEach((node, index) => {
          const headingText = extractHeadingText(node);

          // Check if ID is already set by remark-attr
          const existingId = node.data?.hProperties?.id;
          let headingId: string;

          if (existingId) {
            headingId = existingId;
          } else if (useHierarchicalId && useContentBasedId) {
            // Both hierarchical and content-based: create hierarchical content IDs
            const contentBasedId = generateHeadingId(headingText).replace(`${uniqueIdPrefix}-`, '');

            // Remove parent IDs that are deeper than current level
            while (parentContentIds.length > 0) {
              const lastParent = parentContentIds[parentContentIds.length - 1];
              if (lastParent && lastParent.level >= node.depth) {
                parentContentIds.pop();
              } else {
                break;
              }
            }

            // Build hierarchical content ID
            const parentParts = parentContentIds.map(p => p.contentId);
            const hierarchicalContentId = parentParts.length > 0
              ? `${uniqueIdPrefix}-${parentParts.join('-')}-${contentBasedId}`
              : `${uniqueIdPrefix}-${contentBasedId}`;

            headingId = hierarchicalContentId;

            // Store this heading's content ID for children
            parentContentIds.push({
              level: node.depth,
              contentId: contentBasedId
            });
          } else if (useHierarchicalId && index < hierarchicalNumbers.length) {
            const hierarchicalData = hierarchicalNumbers[index];
            if (hierarchicalData) {
              headingId = generateHierarchicalId(uniqueIdPrefix, hierarchicalData.numbers);
            } else {
              headingId = generateHeadingId(headingText);
            }
          } else {
            headingId = generateHeadingId(headingText);
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
            level: node.depth,
            text: headingText,
            id: headingId
          });
        });

        // Build the tree and populate the provided array
        const builtTree = buildHeadingTree(headings);
        headingTree.push(...builtTree);
      };
    };
  };

  /**
   * Process markdown content with frontmatter
   */
  const process = async (markdown: string, uniqueIdPrefix: string, {
    signal,
    useContentStringHeaderId = false,
    useHierarchicalHeadingId = true,
    advancedOptions
  }: ProcessOptions = {}): Promise<ProcessResult> => {
    // Extract extended options with defaults
    const {
      allowDangerousHtml = true,
      htmlOptions = defaultHtmlOptions,
      gfmOptions = {},
      remarkPlugins = [],
      rehypePlugins = []
    } = advancedOptions || {};
    try {
      // Parse frontmatter
      const { data: frontmatter, content } = parseFrontmatter(markdown);

      // Array to collect heading tree
      const headingTree: HeadingNode[] = [];

      // Create unique ID generators for this processing session
      let idCounter = 0;

      const getUniqueId = (): string => {
        const id = `${uniqueIdPrefix}-${++idCounter}`;
        return id;
      };

      // Create unified processor with plugins
      let processor0 = unified()
        .use(remarkParse);

      // Add custom remark plugins first
      if (remarkPlugins) {
        for (const plugin of remarkPlugins) {
          if (Array.isArray(plugin)) {
            // Plugin with options: [plugin, options]
            processor0 = processor0.use(plugin[0], plugin[1]);
          } else {
            // Plugin without options
            processor0 = processor0.use(plugin as any); // eslint-disable-line @typescript-eslint/no-explicit-any
          }
        }
      }

      let processor = processor0
        .use(remarkGfm, gfmOptions) // Add remark-gfm with options, provide empty object if undefined
        .use(remarkAttr) // Add remark-attr for CSS attribute support (before heading tree and custom plugins)
        .use(createHeadingTreePlugin(
          headingTree,
          useContentStringHeaderId ? (text => generateHeadingId(uniqueIdPrefix, text, getUniqueId)) : getUniqueId,
          useHierarchicalHeadingId,
          useContentStringHeaderId,
          uniqueIdPrefix))
        .use(createCustomBlockPlugin(frontmatter, signal, getUniqueId))
        .use(remarkRehype, { allowDangerousHtml })
        .use(rehypeResponsiveImages) // Add responsive images plugin
        .use(rehypeStringify, { allowDangerousHtml });

      // Add custom rehype plugins last
      if (rehypePlugins) {
        for (const plugin of rehypePlugins) {
          if (Array.isArray(plugin)) {
            // Plugin with options: [plugin, options]
            processor = processor.use(plugin[0], plugin[1]);
          } else {
            // Plugin without options
            processor = processor.use(plugin as any); // eslint-disable-line @typescript-eslint/no-explicit-any
          }
        }
      }

      // Process markdown to HTML
      const result = await processor.process(content);
      const rehypedHtml = String(result);

      // Format HTML with js-beautify, using provided options or defaults from advancedOptions
      const formattedHtml = beautifyHtml(rehypedHtml, htmlOptions);

      return {
        html: formattedHtml,
        frontmatter,
        headingTree
      };
    } catch (error) {
      logger.error(`Failed to process markdown: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error(`Failed to process markdown: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return {
    process
  };
};
