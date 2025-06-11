/**
 * Browser utility functions for e2e tests
 * These functions are meant to be injected into the browser context
 */

/**
 * Script to be injected into the browser context to set up E2E test environment
 */
export function getBrowserInjectionScript(testServerPort: number): string {
  return `
    (function() {
      console.log('[E2E] Setting up test server port ${testServerPort}');
      
      // Store test server port for E2E test page to use
      window.E2E_TEST_SERVER_PORT = ${testServerPort};

      ///////////////////////////////////////////////////////////////////////
      // DANGER: DON'T CHANGE THIS FUNCTION!
      // Do not put any custom hook code here!!!
      // That is not the intent of this test architecture.
      // Tests can be run with the appropriate set of asset files
      // (test-expected/, test-files/, etc.).
      ///////////////////////////////////////////////////////////////////////

      console.log('[E2E] Setup complete');
    })();
  `;
}

/**
 * Normalize HTML for comparison by removing extra whitespace and formatting differences
 */
export function normalizeHtml(html: string): string {
  return html
    .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
    .replace(/>\s+</g, '><')  // Remove whitespace between tags
    .replace(/^\s+|\s+$/g, '')  // Trim leading/trailing whitespace
    // Normalize error messages that vary between browsers
    // Handle WebKit's detailed error messages vs simpler ones in other browsers
    // WebKit pattern: TypeError[message]', 'property' is undefined)]
    // Target pattern: TypeError[message]
    .replace(/typeerror\[finalcachestorage\.get is not a function[^\]]*\][^)]*\)/gi, 'typeerror[finalcachestorage.get is not a function]')
    // Handle various forms of "Failed by" vs "failed by" capitalization
    .replace(/\((failed|Failed) by/gi, '(failed by')
    .toLowerCase();  // Case insensitive comparison
}
