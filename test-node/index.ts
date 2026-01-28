#!/usr/bin/env node

import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { Command, InvalidArgumentError, Option } from 'commander';
import {
  createMarkdownProcessor,
  createOEmbedPlugin,
  createCardPlugin,
  createMermaidPlugin,
  createCachedFetcher,
  type HeadingNode,
} from 'mark-deco';
import { defaultProviderList } from 'mark-deco/misc';

interface ProcessorOptions {
  enableOembed: boolean;
  enableCard: boolean;
  enableMermaid: boolean;
  outputDir: string;
  timeout: number;
}

// Helper function to count total headings in the tree
function countHeadings(headingTree: readonly HeadingNode[]): number {
  let count = 0;
  for (const heading of headingTree) {
    count++; // Count this heading
    if (heading.children && heading.children.length > 0) {
      count += countHeadings(heading.children); // Recursively count children
    }
  }
  return count;
}

async function processMarkdownFile(
  filePath: string,
  options: ProcessorOptions
): Promise<void> {
  try {
    // Read markdown file
    const markdownContent = await readFile(filePath, 'utf-8');
    console.log(`📖 Processing file: ${filePath}`);

    // Create plugins based on options
    const plugins = [];

    if (options.enableOembed) {
      const oembedPlugin = createOEmbedPlugin(defaultProviderList, {
        maxRedirects: 3,
        timeoutEachRedirect: options.timeout,
      });
      plugins.push(oembedPlugin);
      console.log('🎬 oEmbed plugin enabled');
    }

    if (options.enableCard) {
      const cardPlugin = createCardPlugin();
      plugins.push(cardPlugin);
      console.log('📋 Card plugin enabled');
    }

    if (options.enableMermaid) {
      const mermaidPlugin = createMermaidPlugin();
      plugins.push(mermaidPlugin);
      console.log('🧩 Mermaid plugin enabled');
    }

    // Create processor
    const processor = createMarkdownProcessor({
      plugins,
      fetcher: createCachedFetcher('mark-deco-demo/1.0.0', options.timeout),
    });

    // Process markdown
    console.log('⚙️ Processing markdown...');
    const result = await processor.process(markdownContent, 'id', {
      useContentStringHeaderId: true,
      headerTitleTransform: 'none',
    });

    // Ensure output directory exists
    await mkdir(options.outputDir, { recursive: true });

    // Write HTML output
    const htmlPath = path.join(options.outputDir, 'output.html');
    await writeFile(htmlPath, result.html, 'utf-8');
    console.log(`✅ HTML written to: ${htmlPath}`);

    // Write frontmatter output
    const frontmatterPath = path.join(options.outputDir, 'frontmatter.json');
    await writeFile(
      frontmatterPath,
      JSON.stringify(result.frontmatter, null, 2),
      'utf-8'
    );
    console.log(`✅ Frontmatter written to: ${frontmatterPath}`);

    // Write heading tree output
    const headingTreePath = path.join(options.outputDir, 'heading-tree.json');
    await writeFile(
      headingTreePath,
      JSON.stringify(result.headingTree, null, 2),
      'utf-8'
    );
    console.log(`✅ Heading tree written to: ${headingTreePath}`);

    console.log('\n🎉 Processing complete!');
    console.log(`📊 Statistics:`);
    console.log(
      `  - Frontmatter keys: ${Object.keys(result.frontmatter).length}`
    );
    console.log(`  - Total headings: ${countHeadings(result.headingTree)}`);
    console.log(`  - HTML size: ${result.html.length} characters`);
  } catch (error) {
    console.error('❌ Error processing markdown file:', error);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const program = new Command();

  program
    .name('md-processor')
    .summary('Enhanced markdown processor with plugin support')
    .version('1.0.0')
    .argument('<file>', 'Path to markdown file to process')
    .addOption(
      new Option('-o, --output <dir>', 'Output directory').default(
        `./output-${process.pid}-${Date.now()}`
      )
    )
    .addOption(
      new Option('--enable-oembed', 'Enable oEmbed plugin').default(false)
    )
    .addOption(new Option('--enable-card', 'Enable card plugin').default(false))
    .addOption(
      new Option('--enable-mermaid', 'Enable mermaid plugin').default(false)
    )
    .addOption(
      new Option('-t, --timeout <ms>', 'Request timeout in milliseconds')
        .argParser((value: string) => {
          const parsed = Number.parseInt(value, 10);
          if (!Number.isFinite(parsed) || parsed < 0) {
            throw new InvalidArgumentError(
              'timeout must be a non-negative number'
            );
          }
          return parsed;
        })
        .default(5000)
    )
    .action(async (file: string) => {
      const runtimeOptions = program.opts<{
        enableOembed: boolean;
        enableCard: boolean;
        enableMermaid: boolean;
        output: string;
        timeout: number;
      }>();

      const processorOptions: ProcessorOptions = {
        enableOembed: runtimeOptions.enableOembed,
        enableCard: runtimeOptions.enableCard,
        enableMermaid: runtimeOptions.enableMermaid,
        outputDir: path.resolve(runtimeOptions.output),
        timeout: runtimeOptions.timeout,
      };

      console.log('🚀 mark-deco Demo');
      console.log('='.repeat(50));

      await processMarkdownFile(path.resolve(file), processorOptions);
    });

  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('Enhanced markdown processor with plugin support');
  }

  await program.parseAsync();
}

main().catch(console.error);
