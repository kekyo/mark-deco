/**
 * Options for configuring the mermaid plugin
 */
export interface MermaidPluginOptions {
  /** Custom CSS class name for the mermaid container (default: 'mermaid') */
  className?: string;
  /** Whether to include ID attributes for containers (default: true) */
  includeId?: boolean;
}
