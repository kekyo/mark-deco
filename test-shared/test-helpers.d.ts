/**
 * Common test helpers shared between Node.js and E2E tests
 */
/**
 * Create custom oEmbed providers for testing
 * This ensures all oEmbed requests go to local test server instead of external APIs
 */
export declare function createTestCustomProviders(testServerPort: number): {
    provider_name: string;
    provider_url: string;
    endpoints: {
        schemes: string[];
        url: string;
        discovery: boolean;
    }[];
}[];
/**
 * Create a test processor with all plugins enabled and local test server configuration
 */
export declare function createTestProcessor(testServerPort: number, options?: {
    enableOembed?: boolean;
    enableCard?: boolean;
    enableMermaid?: boolean;
    timeout?: number;
}): import("mark-deco").MarkdownProcessor;
/**
 * Normalize HTML for comparison in tests
 */
export declare function normalizeHtml(html: string): string;
/**
 * Extract mermaid diagrams from HTML and return their count and IDs
 */
export declare function extractMermaidInfo(html: string): {
    count: number;
    ids: string[];
    hasSvg: boolean;
};
/**
 * Count total headings in heading tree
 */
export declare function countTotalHeadings(headingTree: any[]): number;
/**
 * Validate that HTML contains expected plugin outputs
 */
export declare function validatePluginOutputs(html: string, expectedPlugins: {
    oembed?: number;
    card?: number;
    mermaid?: number;
}): {
    valid: boolean;
    errors: string[];
    results: {
        oembed: number;
        card: number;
        mermaid: number;
    };
};
