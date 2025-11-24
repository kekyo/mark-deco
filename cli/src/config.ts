// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import { readFile } from 'fs/promises';
import { resolve } from 'path';

export interface Config {
  plugins?: string[];
  noPlugins?: boolean;
  uniqueIdPrefix?: string;
  hierarchicalHeadingId?: boolean;
  contentBasedHeadingId?: boolean;
  h1TitleTransform?: 'extract' | 'extractAndRemove' | 'none';
  // Plugin-specific configurations
  oembed?: {
    enabled?: boolean;
  };
  card?: {
    enabled?: boolean;
  };
  mermaid?: {
    enabled?: boolean;
  };
}

/**
 * Load configuration from file
 */
export async function loadConfig(configPath?: string): Promise<Config> {
  if (!configPath) {
    return {};
  }

  try {
    const configFile = resolve(configPath);
    const configContent = await readFile(configFile, 'utf-8');

    // Support both JSON and JS config files
    if (configPath.endsWith('.json')) {
      return JSON.parse(configContent);
    } else if (configPath.endsWith('.js') || configPath.endsWith('.mjs')) {
      // For JS/MJS files, we need to use dynamic import
      const configModule = await import(configFile);
      return configModule.default || configModule;
    } else {
      // Default to JSON parsing
      return JSON.parse(configContent);
    }
  } catch (error) {
    throw new Error(
      `Failed to load config file "${configPath}": ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get default configuration
 */
export function getDefaultConfig(): Config {
  return {
    plugins: ['oembed', 'card', 'mermaid'],
    uniqueIdPrefix: 'section',
    hierarchicalHeadingId: true,
    contentBasedHeadingId: false,
    h1TitleTransform: 'extractAndRemove',
    oembed: {
      enabled: true,
    },
    card: {
      enabled: true,
    },
    mermaid: {
      enabled: true,
    },
  };
}
