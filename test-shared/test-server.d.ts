export interface TestServer {
    start: () => Promise<void>;
    stop: () => Promise<void>;
    port: number;
    url: string;
}
export interface ViteServer {
    start: () => Promise<void>;
    stop: () => Promise<void>;
    port: number;
    url: string;
}
export interface TestServerConfig {
    /** Preferred port number */
    preferredPort?: number;
    /** Directory containing test content files */
    contentsDir: string;
    /** Whether to enable template variable replacement */
    enableTemplateReplacement?: boolean;
}
/**
 * Create a test server with configurable content directory and template replacement
 */
export declare function createTestServer(config: TestServerConfig): TestServer;
/**
 * Create and manage a Vite development server with dynamic port
 */
export declare function createViteServer(preferredPort?: number): ViteServer;
