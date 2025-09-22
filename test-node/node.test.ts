import { spawn } from 'child_process';
import { readFile, writeFile, mkdir, rm, access } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to run Node.js command
async function runNode(
  args: string[]
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const nodePath = path.resolve(__dirname, './dist/index.js');

    const child = spawn('node', [nodePath, ...args], {
      cwd: __dirname,
      stdio: 'pipe',
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code || 0,
      });
    });
  });
}

describe('Node.js Integration', () => {
  const testOutputDir = path.join(__dirname, './test-node-output');
  // Use unique Node.js-specific test file to support parallel testing
  const testMarkdownFile = path.join(
    __dirname,
    `./test-node-temp-${process.pid}-${Date.now()}.md`
  );

  beforeEach(async () => {
    await mkdir(testOutputDir, { recursive: true });

    // Create Node.js-specific test markdown file
    const testMarkdown = `---
title: "Node.js Test"
author: "Test"
---

# Test Title

This is test content.

# Another Title

More content.`;

    await writeFile(testMarkdownFile, testMarkdown, 'utf-8');
  });

  afterEach(async () => {
    try {
      await rm(testOutputDir, { recursive: true, force: true });
      await rm(testMarkdownFile, { force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should process markdown file and create output files', async () => {
    const result = await runNode([testMarkdownFile, '--output', testOutputDir]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('🎉 Processing complete!');

    // Check if output files exist
    const htmlPath = path.join(testOutputDir, 'output.html');
    const frontmatterPath = path.join(testOutputDir, 'frontmatter.json');
    const headingTreePath = path.join(testOutputDir, 'heading-tree.json');

    await expect(access(htmlPath)).resolves.not.toThrow();
    await expect(access(frontmatterPath)).resolves.not.toThrow();
    await expect(access(headingTreePath)).resolves.not.toThrow();

    // Check content of output files
    const html = await readFile(htmlPath, 'utf-8');
    const frontmatter = JSON.parse(await readFile(frontmatterPath, 'utf-8'));
    const headingTree = JSON.parse(await readFile(headingTreePath, 'utf-8'));

    // Node.js script generates content-based IDs
    expect(html).toContain('<h1 id="id-test-title">Test Title</h1>');
    expect(html).toContain('<h1 id="id-another-title">Another Title</h1>');

    expect(frontmatter).toEqual({
      title: 'Node.js Test',
      author: 'Test',
    });

    expect(headingTree).toHaveLength(2);
    expect(headingTree[0].text).toBe('Test Title');
    expect(headingTree[1].text).toBe('Another Title');
  });

  it('should show help when no arguments provided', async () => {
    const result = await runNode(['--help']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(
      'Enhanced markdown processor with plugin support'
    );
    expect(result.stdout).toContain('--enable-oembed');
    expect(result.stdout).toContain('--enable-card');
  });

  it('should show version information', async () => {
    const result = await runNode(['--version']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('1.0.0');
  });

  it('should handle non-existent file gracefully', async () => {
    const nonExistentFile = path.join(__dirname, 'non-existent.md');

    const result = await runNode([nonExistentFile, '--output', testOutputDir]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Error processing markdown file');
  });

  it('should create output directory if it does not exist', async () => {
    const newOutputDir = path.join(testOutputDir, 'new-dir');

    const result = await runNode([testMarkdownFile, '--output', newOutputDir]);

    expect(result.exitCode).toBe(0);

    // Check if the new directory was created
    await expect(access(newOutputDir)).resolves.not.toThrow();

    // Check if output files exist in the new directory
    const htmlPath = path.join(newOutputDir, 'output.html');
    await expect(access(htmlPath)).resolves.not.toThrow();
  });
});
