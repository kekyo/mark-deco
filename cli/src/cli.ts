// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import { Command, Option } from 'commander';
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
  applyTitleFromH1?: boolean;
  frontmatterOutput?: string;
  headingTreeOutput?: string;
}

const program = new Command();

async function main() {
  program
    .name('mark-deco-cli')
    .summary(
      'MarkDeco - Markdown to HTML conversion processor.\nCopyright (c) Kouji Matsui (@kekyo@mi.kekyo.net)'
    )
    .version(__VERSION__);

  program
    .addOption(
      new Option('-i, --input <file>', 'Input markdown file (default: stdin)')
    )
    .addOption(
      new Option('-o, --output <file>', 'Output HTML file (default: stdout)')
    )
    .addOption(new Option('-c, --config <file>', 'Configuration file path'))
    .addOption(
      new Option(
        '-p, --plugins [plugins...]',
        'Enable specific plugins (oembed, card, mermaid)'
      )
    )
    .addOption(new Option('--no-plugins', 'Disable all default plugins'))
    .addOption(
      new Option(
        '--unique-id-prefix <prefix>',
        'Prefix for unique IDs'
      ).default('section')
    )
    .addOption(
      new Option(
        '--hierarchical-heading-id',
        'Use hierarchical heading IDs'
      ).default(true)
    )
    .addOption(
      new Option(
        '--content-based-heading-id',
        'Use content-based heading IDs'
      ).default(false)
    )
    .addOption(
      new Option(
        '--no-apply-title-from-h1',
        'Disable applying the first H1 to frontmatter.title'
      )
    )
    .addOption(
      new Option(
        '--frontmatter-output <file>',
        'Output frontmatter as JSON to specified file'
      )
    )
    .addOption(
      new Option(
        '--heading-tree-output <file>',
        'Output heading tree as JSON to specified file'
      )
    )
    .action(async () => {
      const options = program.opts<CLIOptions>();
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
        const applyTitleFromH1 =
          options.applyTitleFromH1 ?? config.applyTitleFromH1 ?? true;

        const result = await processor.process(
          markdown,
          options.uniqueIdPrefix || 'section',
          {
            useHierarchicalHeadingId: options.hierarchicalHeadingId ?? true,
            useContentStringHeaderId: options.contentBasedHeadingId ?? false,
            applyTitleFromH1,
          }
        );

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
        console.error(
          'Error:',
          error instanceof Error ? error.message : String(error)
        );
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
  const userArgs = process.argv.slice(2);
  if (
    userArgs.length === 0 ||
    userArgs.includes('--help') ||
    userArgs.includes('-h')
  ) {
    console.log('Enhanced markdown processor with plugin support');
  }
  program.parse();
}

// Run the main function
main().catch((error) => {
  console.error('Failed to start CLI:', error);
  process.exit(1);
});
