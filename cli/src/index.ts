// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import { Command, Option } from 'commander';
import type { HeaderTitleTransform } from 'mark-deco';

import {
  author,
  description,
  git_commit_hash,
  name,
  repository_url,
  version,
} from './generated/packageMetadata';
import { loadConfig } from './config';
import { readInput, writeOutput, writeJsonOutput } from './io';
import { setupProcessor } from './processor';

interface CLIOptions {
  input?: string;
  config?: string;
  output?: string;
  plugins?: string[];
  noPlugins?: boolean;
  uniqueIdPrefix?: string;
  hierarchicalHeadingId?: boolean;
  contentBasedHeadingId?: boolean;
  headingBaseLevel?: number;
  headerTitleTransform?: HeaderTitleTransform;
  frontmatterOutput?: string;
  headingTreeOutput?: string;
}

const program = new Command();

const main = async () => {
  program
    .name(name)
    .summary(description)
    .version(`${version}-${git_commit_hash}`);

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
        '--heading-base-level <level>',
        'Base heading level for markdown headings'
      )
        .argParser((value) => Number.parseInt(value, 10))
        .default(1)
    )
    .addOption(
      new Option(
        '--header-title-transform <mode>',
        'Control how the first base-level heading is applied to frontmatter.title (extract, extractAndRemove, none)'
      ).choices(['extract', 'extractAndRemove', 'none'])
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
        const headerTitleTransform: HeaderTitleTransform =
          options.headerTitleTransform ??
          config.headerTitleTransform ??
          'extractAndRemove';
        const headingBaseLevel =
          options.headingBaseLevel ?? config.headingBaseLevel ?? 1;

        const result = await processor.process(
          markdown,
          options.uniqueIdPrefix || 'section',
          {
            useHierarchicalHeadingId: options.hierarchicalHeadingId ?? true,
            useContentStringHeaderId: options.contentBasedHeadingId ?? false,
            headingBaseLevel,
            headerTitleTransform,
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
    console.log(`${name} [${version}-${git_commit_hash}]`);
    console.log(description);
    console.log(`Copyright (c) ${author}`);
    console.log(repository_url);
    console.log('License: Under MIT');
    console.log('');
  }
  program.parse();
};

// Run the main function
main().catch((error) => {
  console.error('Failed to start CLI:', error);
  process.exit(1);
});
