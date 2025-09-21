import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as http from 'http';
import * as net from 'net';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
 * Check if a port is available
 */
const isPortAvailable = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
};

/**
 * Find an available port starting from the given port
 */
const findAvailablePort = async (startPort: number): Promise<number> => {
  let port = startPort;
  while (port < startPort + 100) { // Try up to 100 ports
    if (await isPortAvailable(port)) {
      return port;
    }
    port++;
  }
  throw new Error(`No available port found starting from ${startPort}`);
};

/**
 * Create a test server with configurable content directory and template replacement
 */
export function createTestServer(config: TestServerConfig): TestServer {
  const {
    preferredPort = 12345,
    contentsDir,
    enableTemplateReplacement = true
  } = config;

  let server: http.Server | null = null;
  let actualPort: number = preferredPort;

  /**
   * Try to read content from file system
   */
  const readContentFile = (filePath: string): string | null => {
    try {
      const fullPath = path.join(contentsDir, filePath);
      return fs.readFileSync(fullPath, 'utf-8');
    } catch {
      return null;
    }
  };

  /**
   * Apply template variable replacement
   */
  const processTemplateVariables = (content: string): string => {
    if (!enableTemplateReplacement) {
      return content;
    }
    return content.replace(/\{\{PORT\}\}/g, actualPort.toString());
  };

  /**
   * Determine content type based on file extension
   */
  const getContentType = (filePath: string): string => {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.html':
        return 'text/html';
      case '.json':
        return 'application/json';
      case '.txt':
        return 'text/plain';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      case '.gif':
        return 'image/gif';
      default:
        return 'text/plain';
    }
  };

  const requestHandler = (req: http.IncomingMessage, res: http.ServerResponse) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const baseUrl = `http://localhost:${actualPort}`;
    let requestUrl: URL;
    try {
      requestUrl = new URL(req.url ?? '/', baseUrl);
    } catch {
      res.writeHead(400);
      res.end('Invalid URL');
      return;
    }

    const pathname = requestUrl.pathname;

    if (!pathname) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    // Handle oEmbed API endpoints for testing
    if (pathname === '/oembed') {
      const urlParam = requestUrl.searchParams.get('url');

      if (!urlParam) {
        res.writeHead(400);
        res.end('Missing url parameter');
        return;
      }

      // Mechanically derive response file from URL pattern
      // Extract path after localhost:port/content/
      const urlObj = new URL(urlParam);
      const pathMatch = urlObj.pathname.match(/^\/content\/(.+)$/);

      let responseFile: string | null = null;

      if (pathMatch) {
        // Convert path segments to filename: /content/video/short-url -> oembed/video-short-url.json
        const contentPath = pathMatch[1].replace(/\//g, '-');
        responseFile = `oembed/${contentPath}.json`;
      } else {
        // Return a generic 404 for unsupported URLs
        res.writeHead(404);
        res.end('{"error": "No oEmbed provider found for URL"}');
        return;
      }

      const content = readContentFile(responseFile);
      if (content) {
        const processedContent = processTemplateVariables(content);
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(processedContent);
        return;
      }
    }

    // Handle card content mock endpoints (for card plugin testing)
    if (pathname.startsWith('/content/')) {
      const contentPath = pathname.substring(1); // Remove leading slash
      let content = readContentFile(contentPath + '.html');

      if (content) {
        const processedContent = processTemplateVariables(content);
        res.setHeader('Content-Type', 'text/html');
        res.writeHead(200);
        res.end(processedContent);
        return;
      }
    }

    // Handle static files (images, etc.)
    let filePath = pathname.substring(1); // Remove leading slash

    // Handle root path
    if (filePath === '') {
      filePath = 'index.html';
    }

    // For oEmbed error endpoint, return specific status code
    if (pathname === '/oembed/error') {
      const content = readContentFile('oembed/error.json');
      if (content) {
        const processedContent = processTemplateVariables(content);
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(404);
        res.end(processedContent);
        return;
      }
    }

    // Try to read content file
    // First try with .html extension
    let content = readContentFile(filePath + '.html');
    let contentType = 'text/html';

    // If not found, try with .json extension
    if (!content) {
      content = readContentFile(filePath + '.json');
      contentType = 'application/json';
    }

    // If still not found, try without extension
    if (!content) {
      content = readContentFile(filePath);
      contentType = getContentType(filePath);
    }

    if (content) {
      const processedContent = processTemplateVariables(content);
      res.setHeader('Content-Type', contentType);
      res.writeHead(200);
      res.end(processedContent);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  };

  return {
    get port() {
      return actualPort;
    },
    start: async () => {
      // Find available port
      actualPort = await findAvailablePort(preferredPort);

      return new Promise((resolve, reject) => {
        server = http.createServer(requestHandler);
        server.listen(actualPort, () => {
          console.log(`Test server running on port ${actualPort}`);
          resolve();
        });
        server.on('error', reject);
      });
    },

    stop: () => {
      return new Promise((resolve) => {
        if (server) {
          server.close(() => {
            console.log('Test server stopped');
            resolve();
          });
        } else {
          resolve();
        }
      });
    },

    get url() {
      return `http://localhost:${actualPort}`;
    }
  };
}

/**
 * Create and manage a Vite development server with dynamic port
 */
export function createViteServer(preferredPort: number = 63783): ViteServer {
  let viteProcess: ChildProcess | null = null;
  let actualPort: number = preferredPort;

  const checkServerReady = async (): Promise<boolean> => {
    try {
      const response = await fetch(`http://localhost:${actualPort}/test-page.html`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  const waitForServerReady = async (maxAttempts: number = 30): Promise<void> => {
    for (let i = 0; i < maxAttempts; i++) {
      if (await checkServerReady()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error('Server failed to become ready within timeout');
  };

  return {
    get port() {
      return actualPort;
    },
    get url() {
      return `http://localhost:${actualPort}`;
    },
    start: async () => {
      actualPort = await findAvailablePort(preferredPort);

      return new Promise((resolve, reject) => {
        // Start Vite development server with dynamic port
        // From test-shared, go to test-e2e
        const e2eDir = path.join(__dirname, '..', 'test-e2e');
        const viteBin = path.join(__dirname, '..', 'node_modules', '.bin', 'vite');
        viteProcess = spawn(viteBin, ['--port', actualPort.toString(), '--host', 'localhost'], {
          cwd: e2eDir,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, NODE_ENV: 'development' }
        });

        let resolved = false;

        const resolveOnce = async () => {
          if (!resolved) {
            resolved = true;
            try {
              // Wait for server to be ready
              await waitForServerReady();
              console.log(`Vite development server started and ready on port ${actualPort}`);
              resolve();
            } catch (error) {
              reject(new Error(`Vite server started but failed to become ready: ${error}`));
            }
          }
        };

        const rejectOnce = (error: unknown) => {
          if (!resolved) {
            resolved = true;
            reject(error);
          }
        };

        if (viteProcess.stdout) {
          viteProcess.stdout.on('data', (data) => {
            const output = data.toString();
            // Look for Vite startup messages indicating server is starting
            if (output.includes('Local:') ||
                output.includes(`localhost:${actualPort}`) ||
                output.includes('ready in')) {
              // Wait a bit and then check if server is ready
              setTimeout(resolveOnce, 2000);
            }
          });
        }

        if (viteProcess.stderr) {
          viteProcess.stderr.on('data', (data) => {
            const output = data.toString();
            // Only reject on severe errors
            if (output.includes('Error') && (output.includes('EADDRINUSE') || output.includes('EACCES'))) {
              rejectOnce(new Error(`Vite server error: ${output}`));
            }
          });
        }

        viteProcess.on('error', (error) => {
          console.error('Vite process error:', error);
          rejectOnce(error);
        });

        viteProcess.on('exit', (code, signal) => {
          if (!resolved) {
            rejectOnce(new Error(`Vite process exited with code ${code}, signal ${signal}`));
          }
        });

        // Longer timeout for Vite startup (60 seconds)
        setTimeout(() => {
          rejectOnce(new Error('Vite server startup timeout after 60 seconds'));
        }, 60000);
      });
    },

    stop: () => {
      return new Promise((resolve) => {
        if (viteProcess) {
          viteProcess.kill('SIGTERM');

          const killTimeout = setTimeout(() => {
            if (viteProcess && !viteProcess.killed) {
              console.log('Force killing Vite process...');
              viteProcess.kill('SIGKILL');
            }
          }, 5000);

          viteProcess.on('exit', () => {
            clearTimeout(killTimeout);
            console.log('Vite development server stopped');
            resolve();
          });
        } else {
          resolve();
        }
      });
    }
  };
}
