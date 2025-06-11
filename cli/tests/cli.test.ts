import { spawn } from 'child_process';
import { readFile, writeFile, unlink } from 'fs/promises';
import * as fs from 'fs/promises';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const spawnAsync = (command: string, args: string[], input?: string): Promise<{ stdout: string; stderr: string; code: number }> => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({ stdout, stderr, code: code || 0 });
    });

    child.on('error', (error) => {
      reject(error);
    });

    if (input) {
      child.stdin.write(input);
      child.stdin.end();
    } else {
      child.stdin.end();
    }
  });
};

const CLI_PATH = resolve(__dirname, '../dist/cli.cjs');

describe('mark-deco-cli', () => {
  it('should display help information', async () => {
    const { stdout } = await spawnAsync('node', [CLI_PATH, '--help']);
    expect(stdout).toContain('mark-deco-cli');
    expect(stdout).toContain('markdown processor');
  });

  it('should process markdown from stdin', async () => {
    const { stdout } = await spawnAsync('node', [CLI_PATH], '# Hello World\n\nThis is a test.');
    expect(stdout).toContain('<h1 id="section-1">Hello World</h1>');
    expect(stdout).toContain('<p>This is a test.</p>');
  });

  it('should process markdown from file', async () => {
    const testFile = resolve(__dirname, 'test-input.md');
    const testContent = `# Test File

This is content from a file.

## Section 2

More content here.`;

    try {
      await writeFile(testFile, testContent);
      const { stdout } = await spawnAsync('node', [CLI_PATH, '-i', testFile]);

      expect(stdout).toContain('<h1 id="section-1">Test File</h1>');
      expect(stdout).toContain('<h2 id="section-1-1">Section 2</h2>');
      expect(stdout).toContain('<p>This is content from a file.</p>');
    } finally {
      try {
        await unlink(testFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  it('should process frontmatter correctly', async () => {
    const markdownWithFrontmatter = `---
title: "Test Document"
author: "Test Author"
---

# Main Content

Some content here.`;

    const { stdout } = await spawnAsync('node', [CLI_PATH], markdownWithFrontmatter);

    expect(stdout).toContain('<h1 id="section-1">Main Content</h1>');
    // Note: frontmatter is no longer output to stderr by default
  });

  it('should handle custom unique-id-prefix', async () => {
    const { stdout } = await spawnAsync('node', [CLI_PATH, '--unique-id-prefix', 'custom'], '# Test Heading');
    expect(stdout).toContain('<h1 id="custom-1">Test Heading</h1>');
  });

  it('should handle file output', async () => {
    const outputFile = resolve(__dirname, 'test-output.html');

    try {
      await spawnAsync('node', [CLI_PATH, '-o', outputFile], '# Output Test\n\nThis should be written to a file.');

      const outputContent = await readFile(outputFile, 'utf-8');
      expect(outputContent).toContain('<h1 id="section-1">Output Test</h1>');
      expect(outputContent).toContain('<p>This should be written to a file.</p>');
    } finally {
      try {
        await unlink(outputFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  it('should handle non-existent input file gracefully', async () => {
    const { code, stderr } = await spawnAsync('node', [CLI_PATH, '-i', 'non-existent-file.md']);
    expect(code).toBe(1);
    expect(stderr).toContain('Failed to read input file');
  });

  it('should handle invalid command line options', async () => {
    const { code } = await spawnAsync('node', [CLI_PATH, '--invalid-option']);
    expect(code).toBe(1);
  });

  it('should output frontmatter to file when specified', async () => {
    const frontmatterFile = resolve(__dirname, 'test-frontmatter.json');
    const markdownWithFrontmatter = `---
title: "Test Document"
author: "Test Author"
---

# Main Content

Some content here.`;

    try {
      await spawnAsync('node', [CLI_PATH, '--frontmatter-output', frontmatterFile], markdownWithFrontmatter);

      const frontmatterContent = await readFile(frontmatterFile, 'utf-8');
      const frontmatter = JSON.parse(frontmatterContent);
      expect(frontmatter.title).toBe('Test Document');
      expect(frontmatter.author).toBe('Test Author');
    } finally {
      try {
        await unlink(frontmatterFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  it('should output heading tree to file when specified', async () => {
    const headingTreeFile = resolve(__dirname, 'test-heading-tree.json');
    const markdownWithHeadings = `# Main Title

## Subtitle 1

### Sub-subtitle

## Subtitle 2

More content.`;

    try {
      await spawnAsync('node', [CLI_PATH, '--heading-tree-output', headingTreeFile], markdownWithHeadings);

      const headingTreeContent = await readFile(headingTreeFile, 'utf-8');
      const headingTree = JSON.parse(headingTreeContent);
      expect(headingTree).toHaveLength(1);
      expect(headingTree[0].text).toBe('Main Title');
      expect(headingTree[0].children).toHaveLength(2);
      expect(headingTree[0].children[0].text).toBe('Subtitle 1');
      expect(headingTree[0].children[1].text).toBe('Subtitle 2');
    } finally {
      try {
        await unlink(headingTreeFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  it('should process markdown with no plugins successfully', async () => {
    const { stdout, code } = await spawnAsync('node', [CLI_PATH, '--no-plugins'], '# Hello World\n\nThis is a test.');
    expect(code).toBe(0);
    expect(stdout).toContain('<h1 id="section-1">Hello World</h1>');
    expect(stdout).toContain('<p>This is a test.</p>');
  });

  it('should process markdown with empty plugin list successfully', async () => {
    const { stdout, code } = await spawnAsync('node', [CLI_PATH, '-p'], '# Hello World\n\nThis is a test.');
    expect(code).toBe(0);
    expect(stdout).toContain('<h1 id="section-1">Hello World</h1>');
    expect(stdout).toContain('<p>This is a test.</p>');
  });

  it('should write frontmatter to specified file', async () => {
    const frontmatterPath = '/tmp/frontmatter-test.json';
    const markdown = `---
title: Test Document
author: Test Author
---

# Hello World

This is a test.`;

    try {
      await fs.unlink(frontmatterPath);
    } catch {
      // Ignore if file doesn't exist
    }

    const { stdout, code } = await spawnAsync('node', [
      CLI_PATH,
      '--frontmatter-output', frontmatterPath,
      '--no-plugins'
    ], markdown);

    expect(code).toBe(0);
    expect(stdout).toContain('<h1 id="section-1">Hello World</h1>');

    // Check frontmatter was written
    const frontmatterContent = await fs.readFile(frontmatterPath, 'utf-8');
    const frontmatterData = JSON.parse(frontmatterContent);
    expect(frontmatterData.title).toBe('Test Document');
    expect(frontmatterData.author).toBe('Test Author');

    // Cleanup
    await fs.unlink(frontmatterPath);
  });

  it('should write heading tree to specified file', async () => {
    const headingTreePath = '/tmp/heading-tree-test.json';
    const markdown = `# Chapter 1

## Section 1.1

### Subsection 1.1.1

## Section 1.2

# Chapter 2`;

    try {
      await fs.unlink(headingTreePath);
    } catch {
      // Ignore if file doesn't exist
    }

    const { stdout, code } = await spawnAsync('node', [
      CLI_PATH,
      '--heading-tree-output', headingTreePath,
      '--no-plugins'
    ], markdown);

    expect(code).toBe(0);
    expect(stdout).toContain('<h1 id="section-1">Chapter 1</h1>');

    // Check heading tree was written
    const headingTreeContent = await fs.readFile(headingTreePath, 'utf-8');
    const headingTreeData = JSON.parse(headingTreeContent);
    expect(Array.isArray(headingTreeData)).toBe(true);
    expect(headingTreeData.length).toBeGreaterThan(0);
    expect(headingTreeData[0].text).toBe('Chapter 1');
    expect(headingTreeData[0].level).toBe(1);

    // Cleanup
    await fs.unlink(headingTreePath);
  });

  it('should write both frontmatter and heading tree to separate files', async () => {
    const frontmatterPath = '/tmp/combined-frontmatter-test.json';
    const headingTreePath = '/tmp/combined-heading-tree-test.json';
    const markdown = `---
title: Combined Test
---

# Main Title

## Subtitle`;

    try {
      await fs.unlink(frontmatterPath);
      await fs.unlink(headingTreePath);
    } catch {
      // Ignore if files don't exist
    }

    const { stdout, code } = await spawnAsync('node', [
      CLI_PATH,
      '--frontmatter-output', frontmatterPath,
      '--heading-tree-output', headingTreePath,
      '--no-plugins'
    ], markdown);

    expect(code).toBe(0);
    expect(stdout).toContain('<h1 id="section-1">Main Title</h1>');

    // Check both files were written
    const frontmatterContent = await fs.readFile(frontmatterPath, 'utf-8');
    const frontmatterData = JSON.parse(frontmatterContent);
    expect(frontmatterData.title).toBe('Combined Test');

    const headingTreeContent = await fs.readFile(headingTreePath, 'utf-8');
    const headingTreeData = JSON.parse(headingTreeContent);
    expect(Array.isArray(headingTreeData)).toBe(true);
    expect(headingTreeData[0].text).toBe('Main Title');

    // Cleanup
    await fs.unlink(frontmatterPath);
    await fs.unlink(headingTreePath);
  });
});
