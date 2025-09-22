import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { test, expect, type Page, type TestInfo } from '@playwright/test';
import * as testHelpers from '../test-shared/test-helpers.js';
import * as testServerModule from '../test-shared/test-server.js';
import type { TestServer, ViteServer } from '../test-shared/test-server.js';

import { getBrowserInjectionScript } from './browser-utils';
import type { MarkdownProcessor } from 'mark-deco';
const { normalizeHtml, extractMermaidInfo } = testHelpers;
const { createTestServer, createViteServer } = testServerModule;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Window型拡張の宣言
declare global {
  interface Window {
    processor?: MarkdownProcessor;
  }
}

let testServer: TestServer;
let viteServer: ViteServer;

test.describe('Integrated E2E Tests', () => {
  test.beforeAll(async ({}, testInfo: TestInfo) => {
    // Start test server with worker-specific port to avoid conflicts
    const basePort = 12347;
    const workerIndex = testInfo.workerIndex || 0;
    const preferredPort = basePort + workerIndex;

    // Additional wait to ensure previous processes are fully cleaned up
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const contentsDir = path.join(
      __dirname,
      '../test-shared/test-server-contents'
    );
    testServer = createTestServer({
      preferredPort: preferredPort,
      contentsDir: contentsDir,
      enableTemplateReplacement: true,
    });
    await testServer.start();
    console.log(`E2E test server running on ${testServer.url}`);

    // Start Vite development server with worker-specific port to avoid conflicts
    const viteBasePort = 63783;
    const vitePreferredPort = viteBasePort + workerIndex;

    viteServer = createViteServer(vitePreferredPort);
    await viteServer.start();
    console.log(`Vite development server running on ${viteServer.url}`);

    // Wait a bit more to ensure servers are fully ready
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  test.afterAll(async () => {
    if (testServer) {
      await testServer.stop();
      // Wait for server to fully stop
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (viteServer) {
      await viteServer.stop();
      // Wait for Vite server to fully stop
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  });

  // Helper function to set up mock fetch in browser
  const setupMockFetch = async (page: Page) => {
    await page.addInitScript(getBrowserInjectionScript(testServer.port));
  };

  // Helper function to wait for processing to complete
  const waitForProcessingComplete = async (page: Page) => {
    // Wait for processing to complete by checking for expected content
    await page.waitForFunction(
      () => {
        const output = document.querySelector('#html-output');
        const content = output?.innerHTML || '';
        // Check that content is not just "Processing..." and has substantial content
        return (
          output &&
          content.trim().length > 50 &&
          !content.includes('class="loading"') &&
          !content.includes('Processing...')
        );
      },
      { timeout: 30000 }
    ); // Increased timeout for oEmbed processing
  };

  // Helper function to wait for processor initialization
  const waitForProcessorInitialization = async (page: Page) => {
    // Wait for processor to be initialized by checking window.processor
    await page.waitForFunction(
      () => {
        return window.processor !== null && window.processor !== undefined;
      },
      { timeout: 30000 }
    );

    // Additional wait to ensure processor is fully ready
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  // Helper function to run a specific test case
  async function runTestCase(page: Page, testName: string) {
    // Enable console logging for debugging
    page.on('console', (msg) => {
      // Show all console logs for debugging
      console.log('BROWSER LOG:', msg.text());
    });

    // Check if test files exist locally
    const markdownPath = path.join(
      __dirname,
      '../test-shared/test-files',
      `${testName}.md`
    );
    const snapshotPath = path.join(
      __dirname,
      'test-expected',
      `${testName}.html`
    );

    if (!fs.existsSync(markdownPath)) {
      console.warn(
        `Skipping test '${testName}': missing markdown file (${markdownPath})`
      );
      test.skip();
      return;
    }

    // Set up mock fetch before navigating to page
    await setupMockFetch(page);

    // Navigate to E2E test page with retry mechanism using dynamic Vite server port
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
      try {
        await page.goto(`${viteServer.url}/test-page.html`, { timeout: 30000 });
        break;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw error;
        }
        console.log(
          `Retrying navigation to E2E test page (attempt ${attempts + 1}/${maxAttempts})`
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Wait for page to load with more generous timeouts
    await page.waitForSelector('#markdown-input', { timeout: 15000 });
    await page.waitForSelector('#process-button', { timeout: 15000 });
    await page.waitForSelector('#html-output', { timeout: 15000 });

    // Wait for processor initialization to complete
    await waitForProcessorInitialization(page);

    // Read test file content and replace PORT placeholder
    let markdownContent = fs.readFileSync(markdownPath, 'utf8');
    markdownContent = markdownContent.replace(
      /\{\{PORT\}\}/g,
      testServer.port.toString()
    );

    // Clear existing content and input test markdown
    await page.fill('#markdown-input', '');
    await page.fill('#markdown-input', markdownContent);

    // Click process button
    await page.click('#process-button');

    // Wait for processing to complete
    await waitForProcessingComplete(page);

    // Get actual output
    const actualHtml = await page.locator('#html-output').innerHTML();

    // If snapshot exists, compare with it
    if (fs.existsSync(snapshotPath)) {
      const expectedHtml = fs.readFileSync(snapshotPath, 'utf8');

      // Compare normalized HTML
      const normalizedActual = normalizeHtml(actualHtml);
      const normalizedExpected = normalizeHtml(expectedHtml);

      // Debug output on failure
      if (normalizedActual !== normalizedExpected) {
        console.log(`\n=== Test Case: ${testName} ===`);
        console.log(
          'Expected (normalized):',
          normalizedExpected.substring(0, 500) + '...'
        );
        console.log(
          'Actual (normalized):',
          normalizedActual.substring(0, 500) + '...'
        );
        console.log('Raw expected:', expectedHtml.substring(0, 300) + '...');
        console.log('Raw actual:', actualHtml.substring(0, 300) + '...');

        // Additional debug for processing issues
        if (
          actualHtml.includes('Processing...') ||
          actualHtml.includes('class="loading"')
        ) {
          console.log(
            '⚠️ Processing appears to be incomplete - content still shows loading state'
          );
        }
      }

      expect(normalizedActual).toBe(normalizedExpected);
    } else {
      // No snapshot - just validate structure and plugins
      console.log(
        `📝 No snapshot for '${testName}' - validating structure only`
      );

      // Basic structure validation
      expect(actualHtml.trim().length).toBeGreaterThan(50);
      expect(actualHtml).not.toContain('Processing...');
      expect(actualHtml).not.toContain('class="loading"');

      // Validate specific plugin outputs based on file content
      if (markdownContent.includes('```mermaid')) {
        const mermaidInfo = extractMermaidInfo(actualHtml);
        expect(mermaidInfo.count).toBeGreaterThan(0);
        console.log(`  🔍 Found ${mermaidInfo.count} mermaid diagrams`);
      }

      if (markdownContent.includes('```oembed')) {
        expect(actualHtml).toContain('oembed-container');
        console.log(`  🔍 Found oEmbed content`);
      }

      if (markdownContent.includes('```card')) {
        expect(actualHtml).toContain('card-container');
        console.log(`  🔍 Found card content`);
      }
    }

    console.log(`✅ Test case '${testName}' passed`);
  }

  // Auto-discover and test all markdown files
  const testFilesDir = path.join(__dirname, '../test-shared/test-files');
  const testFiles = fs
    .readdirSync(testFilesDir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => file.replace('.md', ''));

  // Create individual test cases for each file
  for (const testName of testFiles) {
    test(`should process ${testName} correctly`, async ({ page }) => {
      await runTestCase(page, testName);
    });
  }

  // Special test for mermaid functionality
  test('should render mermaid diagrams as interactive elements', async ({
    page,
  }) => {
    const testFiles = ['mermaid-basic', 'mermaid-complex', 'mermaid-multiple'];

    for (const testName of testFiles) {
      const markdownPath = path.join(
        __dirname,
        '../test-shared/test-files',
        `${testName}.md`
      );
      if (!fs.existsSync(markdownPath)) continue;

      console.log(`🔍 Testing mermaid functionality for: ${testName}`);

      await setupMockFetch(page);
      await page.goto(`${viteServer.url}/test-page.html`, { timeout: 30000 });
      await page.waitForSelector('#markdown-input', { timeout: 15000 });
      await waitForProcessorInitialization(page);

      let markdownContent = fs.readFileSync(markdownPath, 'utf8');
      markdownContent = markdownContent.replace(
        /\{\{PORT\}\}/g,
        testServer.port.toString()
      );
      await page.fill('#markdown-input', '');
      await page.fill('#markdown-input', markdownContent);
      await page.click('#process-button');
      await waitForProcessingComplete(page);

      // Wait a bit more for potential mermaid rendering in browser
      await page.waitForTimeout(3000);

      const actualHtml = await page.locator('#html-output').innerHTML();
      const mermaidInfo = extractMermaidInfo(actualHtml);

      expect(mermaidInfo.count).toBeGreaterThan(0);
      console.log(
        `  ✅ ${testName}: Found ${mermaidInfo.count} mermaid diagrams`
      );

      // Check if mermaid content is properly structured
      const mermaidDivs = await page.locator('.mermaid').count();
      expect(mermaidDivs).toBe(mermaidInfo.count);

      console.log(`  📊 Browser rendered ${mermaidDivs} mermaid elements`);
    }
  });
});
