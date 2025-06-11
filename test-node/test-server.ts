import * as fs from 'fs';
import * as http from 'http';
import * as net from 'net';
import * as path from 'path';
import * as url from 'url';

export interface TestServer {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  port: number;
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

export function createTestServer(preferredPort: number = 12345): TestServer {
  let server: http.Server | null = null;
  let actualPort: number = preferredPort;

  const contentsDir = path.join(__dirname, '../test-server-contents');

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

    const parsedUrl = url.parse(req.url || '', true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    if (!pathname) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    // Handle oEmbed API endpoints for testing
    if (pathname === '/oembed') {
      const urlParam = query.url as string;

      if (!urlParam) {
        res.writeHead(400);
        res.end('Missing url parameter');
        return;
      }

      let responseFile: string | null = null;

      // Determine which mock response to use based on URL
      if (urlParam.includes('flickr.com/photos/bees/2362225867')) {
        responseFile = 'oembed/flickr-photo.json';
      } else if (urlParam.includes('youtu.be/1La4QzGeaaQ') || urlParam.includes('youtube.com/watch?v=1La4QzGeaaQ')) {
        responseFile = 'oembed/youtube-video-short.json';
      } else if (urlParam.includes('youtu.be/lwuMTMhY85c') || urlParam.includes('youtube.com/watch?v=lwuMTMhY85c')) {
        responseFile = 'oembed/youtube-video-43.json';
      } else {
        // Return a generic 404 for unsupported URLs
        res.writeHead(404);
        res.end('{"error": "No oEmbed provider found for URL"}');
        return;
      }

      const content = readContentFile(responseFile);
      if (content) {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(content);
        return;
      }
    }

    // Remove leading slash and handle special cases
    let filePath = pathname.substring(1);

    // Handle root path
    if (filePath === '') {
      filePath = 'index.html';
    }

    // For oEmbed error endpoint, return specific status code
    if (pathname === '/oembed/error') {
      const content = readContentFile('oembed/error.json');
      if (content) {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(404);
        res.end(content);
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
      res.setHeader('Content-Type', contentType);
      res.writeHead(200);
      res.end(content);
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
    }
  };
}
