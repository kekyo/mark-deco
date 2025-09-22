// Browser polyfills for Node.js modules
// Completely avoid importing external buffer module to prevent Vite externalization

// Custom Buffer implementation for browser environment
class CustomBuffer {
  data: Uint8Array;

  constructor(data?: string | ArrayBuffer | Uint8Array | number | number[]) {
    if (typeof data === 'string') {
      this.data = new TextEncoder().encode(data);
    } else if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
      this.data = new Uint8Array(data);
    } else if (Array.isArray(data)) {
      this.data = new Uint8Array(data);
    } else if (typeof data === 'number') {
      this.data = new Uint8Array(data);
    } else {
      this.data = new Uint8Array(0);
    }
  }

  static from(
    data: string | ArrayBuffer | Uint8Array | number[]
  ): CustomBuffer {
    if (typeof data === 'string') {
      return new CustomBuffer(data);
    }
    return new CustomBuffer(data);
  }

  static alloc(size: number, fill = 0): CustomBuffer {
    const buffer = new CustomBuffer(size);
    if (fill !== 0) {
      buffer.data.fill(fill);
    }
    return buffer;
  }

  static allocUnsafe(size: number): CustomBuffer {
    return new CustomBuffer(size);
  }

  static isBuffer(obj: unknown): obj is CustomBuffer {
    return obj instanceof CustomBuffer;
  }

  static concat(buffers: CustomBuffer[], totalLength?: number): CustomBuffer {
    if (!Array.isArray(buffers)) {
      throw new TypeError('The "buffers" argument must be an array');
    }

    if (buffers.length === 0) {
      return new CustomBuffer(0);
    }

    let length = 0;
    if (totalLength === undefined) {
      for (const buffer of buffers) {
        length += buffer.length;
      }
    } else {
      length = totalLength;
    }

    const result = new Uint8Array(length);
    let offset = 0;

    for (const buffer of buffers) {
      const data = buffer.data || buffer;
      result.set(data, offset);
      offset += data.length;
      if (offset >= length) break;
    }

    const resultBuffer = new CustomBuffer(0);
    resultBuffer.data = result;
    return resultBuffer;
  }

  toString(encoding = 'utf8'): string {
    if (encoding === 'hex') {
      return Array.from(this.data)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
    return new TextDecoder(encoding).decode(this.data);
  }

  slice(start = 0, end = this.data.length): CustomBuffer {
    const sliced = this.data.slice(start, end);
    const buffer = new CustomBuffer(0);
    buffer.data = sliced;
    return buffer;
  }

  get length(): number {
    return this.data.length;
  }

  // Array-like access
  [Symbol.iterator](): Iterator<number> {
    return this.data[Symbol.iterator]();
  }
}

// Set up global variables that mark-deco expects
(globalThis as unknown as { Buffer: typeof CustomBuffer }).Buffer =
  CustomBuffer;
(globalThis as unknown as { global: typeof globalThis }).global = globalThis;

// Process polyfill
interface ProcessEnv {
  NODE_ENV: string;
  [key: string]: string | undefined;
}

interface Process {
  env: ProcessEnv;
  platform: string;
  version: string;
  nextTick: (fn: () => void) => void;
  cwd: () => string;
  versions: { node: string };
}

const processPolyfill: Process = {
  env: { NODE_ENV: 'development' },
  platform: 'browser',
  version: 'v18.0.0',
  nextTick: (fn: () => void) => setTimeout(fn, 0),
  cwd: () => '/',
  versions: { node: 'v18.0.0' },
};

(globalThis as unknown as { process: Process }).process = processPolyfill;

// Ensure window also has these globals for compatibility
if (typeof window !== 'undefined') {
  (window as unknown as { Buffer: typeof CustomBuffer }).Buffer = CustomBuffer;
  (window as unknown as { global: typeof globalThis }).global = globalThis;
  (window as unknown as { process: Process }).process = processPolyfill;
}

console.log('✅ Polyfills loaded successfully:', {
  Buffer: typeof CustomBuffer !== 'undefined',
  'globalThis.Buffer':
    typeof (globalThis as { Buffer?: unknown }).Buffer !== 'undefined',
  'globalThis.process':
    typeof (globalThis as { process?: unknown }).process !== 'undefined',
  'globalThis.global':
    typeof (globalThis as { global?: unknown }).global !== 'undefined',
});

// Minimal fs polyfill to prevent errors from libraries
interface FsPolyfill {
  readFileSync: () => never;
  writeFileSync: () => never;
  existsSync: () => boolean;
  statSync: () => never;
  mkdirSync: () => never;
}

const fs: FsPolyfill = {
  readFileSync: (): never => {
    throw new Error('fs.readFileSync is not available in browser environment');
  },
  writeFileSync: (): never => {
    throw new Error('fs.writeFileSync is not available in browser environment');
  },
  existsSync: (): boolean => false,
  statSync: (): never => {
    throw new Error('fs.statSync is not available in browser environment');
  },
  mkdirSync: (): never => {
    throw new Error('fs.mkdirSync is not available in browser environment');
  },
};

export default fs;
export const { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } =
  fs;
