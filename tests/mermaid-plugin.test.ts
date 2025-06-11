import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getNoOpLogger } from '../src/logger.js';
import { createMermaidPlugin } from '../src/plugins/mermaid-plugin.js';
import type { Plugin, PluginContext, FrontmatterData } from '../src/types.js';

/**
 * HTML escape function to match the plugin implementation
 */
const escapeHtml = (content: string): string => {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

describe('MermaidPlugin', () => {
  let plugin: Plugin;
  let mockContext: PluginContext;
  let mockGetUniqueId: ReturnType<typeof vi.fn<[], string>>;

  beforeEach(() => {
    mockGetUniqueId = vi.fn<[], string>(() => 'test-id-123');

    mockContext = {
      logger: getNoOpLogger(),
      signal: new AbortController().signal,
      frontmatter: {},
      fetcher: {
        rawFetcher: vi.fn(),
        userAgent: 'test-user-agent'
      },
      getUniqueId: mockGetUniqueId
    };
  });

  describe('Plugin Creation', () => {
    it('should create plugin with default options', () => {
      plugin = createMermaidPlugin();
      expect(plugin.name).toBe('mermaid');
      expect(typeof plugin.processBlock).toBe('function');
    });

    it('should create plugin with custom options', () => {
      plugin = createMermaidPlugin({ className: 'custom-mermaid', includeId: true });
      expect(plugin.name).toBe('mermaid');
    });
  });

  describe('Process Block', () => {
    beforeEach(() => {
      // Use includeId: false for backward compatibility tests
      plugin = createMermaidPlugin({ includeId: false });
    });

    it('should process simple flowchart', async () => {
      const mermaidCode = `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]`;

      const result = await plugin.processBlock(mermaidCode, mockContext);

      const expectedHtml = `<div class="mermaid-wrapper">
  <style>
    .mermaid-wrapper .mermaid > svg {
      width: auto !important;
      height: auto !important;
      max-width: none !important;
    }
  </style>
  <div class="mermaid">${escapeHtml(mermaidCode)}</div>
</div>`;
      expect(result).toBe(expectedHtml);
    });

    it('should process sequence diagram', async () => {
      const mermaidCode = `sequenceDiagram
    participant A as Alice
    participant B as Bob
    A->>B: Hello Bob, how are you?
    B-->>A: Great!`;

      const result = await plugin.processBlock(mermaidCode, mockContext);

      const expectedHtml = `<div class="mermaid-wrapper">
  <style>
    .mermaid-wrapper .mermaid > svg {
      width: auto !important;
      height: auto !important;
      max-width: none !important;
    }
  </style>
  <div class="mermaid">${escapeHtml(mermaidCode)}</div>
</div>`;
      expect(result).toBe(expectedHtml);
    });

    it('should handle empty content', async () => {
      const result = await plugin.processBlock('', mockContext);

      const expectedHtml = `<div class="mermaid-wrapper">
  <style>
    .mermaid-wrapper .mermaid > svg {
      width: auto !important;
      height: auto !important;
      max-width: none !important;
    }
  </style>
  <div class="mermaid"><!-- Empty mermaid content --></div>
</div>`;
      expect(result).toBe(expectedHtml);
    });

    it('should handle whitespace-only content', async () => {
      const result = await plugin.processBlock('   \n   \t   ', mockContext);

      const expectedHtml = `<div class="mermaid-wrapper">
  <style>
    .mermaid-wrapper .mermaid > svg {
      width: auto !important;
      height: auto !important;
      max-width: none !important;
    }
  </style>
  <div class="mermaid"><!-- Empty mermaid content --></div>
</div>`;
      expect(result).toBe(expectedHtml);
    });

    it('should trim whitespace from content', async () => {
      const mermaidCode = `graph LR
    A --> B`;
      const contentWithWhitespace = `   \n${mermaidCode}\n   `;

      const result = await plugin.processBlock(contentWithWhitespace, mockContext);

      const expectedHtml = `<div class="mermaid-wrapper">
  <style>
    .mermaid-wrapper .mermaid > svg {
      width: auto !important;
      height: auto !important;
      max-width: none !important;
    }
  </style>
  <div class="mermaid">${escapeHtml(mermaidCode)}</div>
</div>`;
      expect(result).toBe(expectedHtml);
    });
  });

  describe('Custom Options', () => {
    it('should use custom className', async () => {
      plugin = createMermaidPlugin({ className: 'custom-diagram', includeId: false });

      const result = await plugin.processBlock('graph LR\nA --> B', mockContext);

      const expectedHtml = `<div class="custom-diagram-wrapper">
  <style>
    .custom-diagram-wrapper .custom-diagram > svg {
      width: auto !important;
      height: auto !important;
      max-width: none !important;
    }
  </style>
  <div class="custom-diagram">${escapeHtml('graph LR\nA --> B')}</div>
</div>`;
      expect(result).toBe(expectedHtml);
    });

    it('should include ID when includeId is true', async () => {
      plugin = createMermaidPlugin({ includeId: true });

      const result = await plugin.processBlock('graph LR\nA --> B', mockContext);

      const expectedHtml = `<div class="mermaid-wrapper">
  <style>
    .mermaid-wrapper .mermaid > svg {
      width: auto !important;
      height: auto !important;
      max-width: none !important;
    }
  </style>
  <div class="mermaid" id="test-id-123">${escapeHtml('graph LR\nA --> B')}</div>
</div>`;
      expect(result).toBe(expectedHtml);
      expect(mockGetUniqueId).toHaveBeenCalledOnce();
    });

    it('should not include ID when includeId is false', async () => {
      plugin = createMermaidPlugin({ includeId: false });

      const result = await plugin.processBlock('graph LR\nA --> B', mockContext);

      const expectedHtml = `<div class="mermaid-wrapper">
  <style>
    .mermaid-wrapper .mermaid > svg {
      width: auto !important;
      height: auto !important;
      max-width: none !important;
    }
  </style>
  <div class="mermaid">${escapeHtml('graph LR\nA --> B')}</div>
</div>`;
      expect(result).toBe(expectedHtml);
      expect(mockGetUniqueId).not.toHaveBeenCalled();
    });

    it('should combine custom className and includeId', async () => {
      plugin = createMermaidPlugin({ className: 'my-mermaid', includeId: true });

      const result = await plugin.processBlock('graph TD\nA --> B', mockContext);

      const expectedHtml = `<div class="my-mermaid-wrapper">
  <style>
    .my-mermaid-wrapper .my-mermaid > svg {
      width: auto !important;
      height: auto !important;
      max-width: none !important;
    }
  </style>
  <div class="my-mermaid" id="test-id-123">${escapeHtml('graph TD\nA --> B')}</div>
</div>`;
      expect(result).toBe(expectedHtml);
    });
  });

  describe('Different Mermaid Diagram Types', () => {
    beforeEach(() => {
      // Use includeId: false for backward compatibility tests
      plugin = createMermaidPlugin({ includeId: false });
    });

    it('should handle pie chart', async () => {
      const mermaidCode = `pie title Pets adopted by volunteers
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15`;

      const result = await plugin.processBlock(mermaidCode, mockContext);

      const expectedHtml = `<div class="mermaid-wrapper">
  <style>
    .mermaid-wrapper .mermaid > svg {
      width: auto !important;
      height: auto !important;
      max-width: none !important;
    }
  </style>
  <div class="mermaid">${escapeHtml(mermaidCode)}</div>
</div>`;
      expect(result).toBe(expectedHtml);
    });

    it('should handle gantt chart', async () => {
      const mermaidCode = `gantt
    title A Gantt Diagram
    dateFormat  YYYY-MM-DD
    section Section
    A task           :a1, 2014-01-01, 30d
    Another task     :after a1  , 20d`;

      const result = await plugin.processBlock(mermaidCode, mockContext);

      const expectedHtml = `<div class="mermaid-wrapper">
  <style>
    .mermaid-wrapper .mermaid > svg {
      width: auto !important;
      height: auto !important;
      max-width: none !important;
    }
  </style>
  <div class="mermaid">${escapeHtml(mermaidCode)}</div>
</div>`;
      expect(result).toBe(expectedHtml);
    });

    it('should handle class diagram', async () => {
      const mermaidCode = `classDiagram
    class Animal{
        +int age
        +String gender
        +isMammal()
        +mate()
    }`;

      const result = await plugin.processBlock(mermaidCode, mockContext);

      const expectedHtml = `<div class="mermaid-wrapper">
  <style>
    .mermaid-wrapper .mermaid > svg {
      width: auto !important;
      height: auto !important;
      max-width: none !important;
    }
  </style>
  <div class="mermaid">${escapeHtml(mermaidCode)}</div>
</div>`;
      expect(result).toBe(expectedHtml);
    });
  });

  describe('Frontmatter Integration', () => {
    beforeEach(() => {
      // Use includeId: false for backward compatibility tests
      plugin = createMermaidPlugin({ includeId: false });
    });

    it('should process with frontmatter data present', async () => {
      const frontmatter: FrontmatterData = {
        title: 'Test Document',
        mermaidTheme: 'dark'
      };

      // Update context with frontmatter
      const contextWithFrontmatter = { ...mockContext, frontmatter };

      const result = await plugin.processBlock('graph LR\nA --> B', contextWithFrontmatter);

      const expectedHtml = `<div class="mermaid-wrapper">
  <style>
    .mermaid-wrapper .mermaid > svg {
      width: auto !important;
      height: auto !important;
      max-width: none !important;
    }
  </style>
  <div class="mermaid">${escapeHtml('graph LR\nA --> B')}</div>
</div>`;
      expect(result).toBe(expectedHtml);
    });
  });

  describe('Special Characters and Escaping', () => {
    beforeEach(() => {
      // Use includeId: false for backward compatibility tests
      plugin = createMermaidPlugin({ includeId: false });
    });

    it('should handle special characters in diagram content', async () => {
      const mermaidCode = `graph LR
    A["Start with <special> & characters"] --> B["End & done"]`;

      const result = await plugin.processBlock(mermaidCode, mockContext);

      const expectedHtml = `<div class="mermaid-wrapper">
  <style>
    .mermaid-wrapper .mermaid > svg {
      width: auto !important;
      height: auto !important;
      max-width: none !important;
    }
  </style>
  <div class="mermaid">${escapeHtml(mermaidCode)}</div>
</div>`;
      expect(result).toBe(expectedHtml);
    });

    it('should handle quotes in diagram labels', async () => {
      const mermaidCode = `graph LR
    A["Quote: 'Hello World'"] --> B['Double: "Hello"']`;

      const result = await plugin.processBlock(mermaidCode, mockContext);

      const expectedHtml = `<div class="mermaid-wrapper">
  <style>
    .mermaid-wrapper .mermaid > svg {
      width: auto !important;
      height: auto !important;
      max-width: none !important;
    }
  </style>
  <div class="mermaid">${escapeHtml(mermaidCode)}</div>
</div>`;
      expect(result).toBe(expectedHtml);
    });
  });

  describe('ID Output Tests', () => {
    it('should include ID attributes when includeId is true by default', async () => {
      plugin = createMermaidPlugin(); // Default includeId is true

      const result = await plugin.processBlock('graph LR\nA --> B', mockContext);

      const expectedHtml = `<div class="mermaid-wrapper">
  <style>
    .mermaid-wrapper .mermaid > svg {
      width: auto !important;
      height: auto !important;
      max-width: none !important;
    }
  </style>
  <div class="mermaid" id="test-id-123">${escapeHtml('graph LR\nA --> B')}</div>
</div>`;
      expect(result).toBe(expectedHtml);
      // Check that ID is actually included
      expect(result).toContain('id="test-id-123"');
      expect(mockGetUniqueId).toHaveBeenCalledOnce();
    });

    it('should not include ID attributes when includeId is false', async () => {
      plugin = createMermaidPlugin({ includeId: false });

      const result = await plugin.processBlock('graph LR\nA --> B', mockContext);

      // Check that ID is not included
      expect(result).not.toContain('id=');
      expect(mockGetUniqueId).not.toHaveBeenCalled();
    });

    it('should generate unique IDs for multiple diagrams', async () => {
      plugin = createMermaidPlugin({ includeId: true });
      mockGetUniqueId.mockReturnValueOnce('first-id').mockReturnValueOnce('second-id');

      const result1 = await plugin.processBlock('graph LR\nA --> B', mockContext);
      const result2 = await plugin.processBlock('graph TD\nC --> D', mockContext);

      expect(result1).toContain('id="first-id"');
      expect(result2).toContain('id="second-id"');
      expect(mockGetUniqueId).toHaveBeenCalledTimes(2);
    });
  });
});
