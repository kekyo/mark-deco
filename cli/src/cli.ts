import { Command } from 'commander';
import { loadConfig } from './config.js';
import { readInput, writeOutput, writeJsonOutput } from './io.js';
import { setupProcessor } from './processor.js';

// Version is injected at build time by Vite
declare const __VERSION__: string;

interface CLIOptions {
  input?: string;
  config?: string;
  output?: string;
  plugins?: string[];
  noPlugins?: boolean;
  uniqueIdPrefix?: string;
  hierarchicalHeadingId?: boolean;
  contentBasedHeadingId?: boolean;
  frontmatterOutput?: string;
  headingTreeOutput?: string;
}

const program = new Command();

async function main() {
  program
    .name('mark-deco-cli')
    .description('MarkDeco - Markdown to HTML conversion processor.\nCopyright (c) Kouji Matsui (@kekyo@mi.kekyo.net)')
    .version(__VERSION__);

  program
    .option('-i, --input <file>', 'Input markdown file (default: stdin)')
    .option('-o, --output <file>', 'Output HTML file (default: stdout)')
    .option('-c, --config <file>', 'Configuration file path')
    .option('-p, --plugins [plugins...]', 'Enable specific plugins (oembed, card, mermaid)')
    .option('--no-plugins', 'Disable all default plugins')
    .option('--unique-id-prefix <prefix>', 'Prefix for unique IDs', 'section')
    .option('--hierarchical-heading-id', 'Use hierarchical heading IDs', true)
    .option('--content-based-heading-id', 'Use content-based heading IDs', false)
    .option('--frontmatter-output <file>', 'Output frontmatter as JSON to specified file')
    .option('--heading-tree-output <file>', 'Output heading tree as JSON to specified file')
    .action(async (options: CLIOptions) => {
      try {
        // Load configuration
        const config = await loadConfig(options.config);

        // Merge CLI options with config
        const mergedOptions = { ...config, ...options };

        // Read input
        const markdown = await readInput(options.input);

        // Setup processor with plugins
        const processor = setupProcessor(mergedOptions);

        // Process markdown
        const result = await processor.process(markdown, options.uniqueIdPrefix || 'section', {
          useHierarchicalHeadingId: options.hierarchicalHeadingId ?? true,
          useContentStringHeaderId: options.contentBasedHeadingId ?? false
        });

        // Write output
        await writeOutput(result.html, options.output);

        // Write frontmatter if output path is specified
        if (options.frontmatterOutput) {
          await writeJsonOutput(result.frontmatter, options.frontmatterOutput);
        }

        // Write heading tree if output path is specified
        if (options.headingTreeOutput) {
          await writeJsonOutput(result.headingTree, options.headingTreeOutput);
        }

      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  // Handle unhandled errors
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
  });

  // Parse command line arguments
  program.parse();
}

// Run the main function
main().catch((error) => {
  console.error('Failed to start CLI:', error);
  process.exit(1);
});
