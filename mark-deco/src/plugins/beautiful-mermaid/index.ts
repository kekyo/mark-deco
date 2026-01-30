// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import type {
  CodeHighlightTheme,
  CodeHighlightThemeConfig,
  MarkdownProcessorPlugin,
  MarkdownProcessorPluginContext,
} from '../../types';
import { escapeHtml } from '../../utils';
import type { BeautifulMermaidPluginOptions } from './types';
import type {
  AsciiRenderOptions,
  DiagramColors,
  RenderOptions,
} from 'beautiful-mermaid';
import { getSingletonHighlighter } from 'shiki';

/**
 * Lazy-load beautiful-mermaid to support both ESM/CJS builds.
 */
type ShikiThemeLike = {
  type?: string;
  colors?: Record<string, string>;
  tokenColors?: Array<{
    scope?: string | string[];
    settings?: {
      foreground?: string;
    };
  }>;
};

type BeautifulMermaidModule = {
  renderMermaid: (text: string, options?: RenderOptions) => Promise<string>;
  renderMermaidAscii: (text: string, options?: AsciiRenderOptions) => string;
  fromShikiTheme: (theme: ShikiThemeLike) => DiagramColors;
  THEMES?: Record<string, DiagramColors>;
};

type ThemeColorsPair = {
  light?: DiagramColors;
  dark?: DiagramColors;
};

let cachedModule: BeautifulMermaidModule | undefined;
let modulePromise: Promise<BeautifulMermaidModule> | undefined;

const loadBeautifulMermaid = async (): Promise<BeautifulMermaidModule> => {
  if (cachedModule) {
    return cachedModule;
  }

  if (!modulePromise) {
    modulePromise = import('beautiful-mermaid').then((mod) => {
      const resolved =
        typeof (mod as BeautifulMermaidModule).renderMermaid === 'function'
          ? (mod as BeautifulMermaidModule)
          : ((mod as { default?: BeautifulMermaidModule }).default ?? mod);
      return resolved as BeautifulMermaidModule;
    });
  }

  cachedModule = await modulePromise;
  return cachedModule;
};

const themeColorCache = new Map<string, DiagramColors>();
const shikiThemeCache = new Map<string, ShikiThemeLike>();

const resolveShikiTheme = async (
  themeName: string
): Promise<ShikiThemeLike> => {
  const cached = shikiThemeCache.get(themeName);
  if (cached) {
    return cached;
  }

  const highlighter = await getSingletonHighlighter({
    themes: [themeName],
  } as Parameters<typeof getSingletonHighlighter>[0]);
  const theme = highlighter.getTheme(themeName) as ShikiThemeLike;
  shikiThemeCache.set(themeName, theme);
  return theme;
};

const renderFallbackCodeBlock = (content: string): string => {
  return `<pre><code class="language-mermaid">${escapeHtml(content)}</code></pre>`;
};

const resolveAsciiOptions = (
  options?: AsciiRenderOptions
): AsciiRenderOptions => {
  return {
    ...options,
    useAscii: options?.useAscii ?? false,
  };
};

const isThemeConfig = (
  theme: BeautifulMermaidPluginOptions['theme']
): theme is CodeHighlightThemeConfig => {
  return (
    typeof theme === 'object' &&
    theme !== null &&
    ('light' in theme || 'dark' in theme)
  );
};

const normalizeThemeConfig = (
  theme: BeautifulMermaidPluginOptions['theme']
): { light?: CodeHighlightTheme; dark?: CodeHighlightTheme } | undefined => {
  if (!theme) {
    return undefined;
  }
  if (!isThemeConfig(theme)) {
    return { light: theme, dark: theme };
  }
  const resolvedLight = theme.light ?? theme.dark;
  const resolvedDark = theme.dark ?? theme.light;
  if (resolvedLight === undefined || resolvedDark === undefined) {
    return undefined;
  }
  return {
    light: resolvedLight,
    dark: resolvedDark,
  };
};

const normalizeThemeRegistration = (
  theme: CodeHighlightTheme
): ShikiThemeLike => {
  if (!theme || typeof theme !== 'object') {
    return theme as ShikiThemeLike;
  }
  if (
    'tokenColors' in theme &&
    (theme as { tokenColors?: unknown }).tokenColors
  ) {
    return theme as ShikiThemeLike;
  }
  if ('settings' in theme) {
    const settings = (theme as { settings?: unknown }).settings;
    if (settings) {
      return {
        ...(theme as unknown as Record<string, unknown>),
        tokenColors: settings,
      } as ShikiThemeLike;
    }
  }
  return theme as ShikiThemeLike;
};

const resolveThemeColors = async (
  theme: CodeHighlightTheme,
  module: BeautifulMermaidModule,
  context: MarkdownProcessorPluginContext
): Promise<DiagramColors | undefined> => {
  if (typeof theme === 'string') {
    const cached = themeColorCache.get(theme);
    if (cached) {
      return cached;
    }

    if (module.THEMES && theme in module.THEMES) {
      const colors = module.THEMES[theme];
      if (colors) {
        themeColorCache.set(theme, colors);
        return colors;
      }
    }

    try {
      const shikiTheme = await resolveShikiTheme(theme);
      const colors = module.fromShikiTheme(shikiTheme);
      themeColorCache.set(theme, colors);
      return colors;
    } catch (error) {
      context.logger.warn(
        'Beautiful Mermaid plugin failed to load Shiki theme:',
        theme,
        error
      );
      return undefined;
    }
  }

  try {
    return module.fromShikiTheme(normalizeThemeRegistration(theme));
  } catch (error) {
    context.logger.warn(
      'Beautiful Mermaid plugin failed to parse theme object:',
      error
    );
    return undefined;
  }
};

const resolveThemeColorsPair = async (
  theme: BeautifulMermaidPluginOptions['theme'],
  module: BeautifulMermaidModule,
  context: MarkdownProcessorPluginContext
): Promise<ThemeColorsPair | undefined> => {
  const normalized = normalizeThemeConfig(theme);
  if (!normalized) {
    return undefined;
  }

  const light = normalized.light
    ? await resolveThemeColors(normalized.light, module, context)
    : undefined;
  const dark = normalized.dark
    ? await resolveThemeColors(normalized.dark, module, context)
    : undefined;

  const resolvedLight = light ?? dark;
  const resolvedDark = dark ?? light;
  if (!resolvedLight || !resolvedDark) {
    return undefined;
  }

  return {
    light: resolvedLight,
    dark: resolvedDark,
  };
};

const normalizeCssVarPrefix = (prefix: string): string => {
  if (prefix.startsWith('--')) {
    return prefix;
  }
  return `--${prefix}`;
};

const buildCssVarNames = (prefix: string) => {
  return {
    bg: `${prefix}-bg`,
    fg: `${prefix}-fg`,
    line: `${prefix}-line`,
    accent: `${prefix}-accent`,
    muted: `${prefix}-muted`,
    surface: `${prefix}-surface`,
    border: `${prefix}-border`,
  } as const;
};

const buildCssVarStyle = (
  colors: DiagramColors | undefined,
  vars: ReturnType<typeof buildCssVarNames>
): string => {
  if (!colors) {
    return '';
  }

  const entries: string[] = [];
  if (colors.bg) entries.push(`${vars.bg}: ${colors.bg}`);
  if (colors.fg) entries.push(`${vars.fg}: ${colors.fg}`);
  if (colors.line) entries.push(`${vars.line}: ${colors.line}`);
  if (colors.accent) entries.push(`${vars.accent}: ${colors.accent}`);
  if (colors.muted) entries.push(`${vars.muted}: ${colors.muted}`);
  if (colors.surface) entries.push(`${vars.surface}: ${colors.surface}`);
  if (colors.border) entries.push(`${vars.border}: ${colors.border}`);

  return entries.join('; ');
};

const buildCssVarRenderOptions = (
  vars: ReturnType<typeof buildCssVarNames>
): RenderOptions => {
  return {
    bg: `var(${vars.bg})`,
    fg: `var(${vars.fg})`,
    line: `var(${vars.line})`,
    accent: `var(${vars.accent})`,
    muted: `var(${vars.muted})`,
    surface: `var(${vars.surface})`,
    border: `var(${vars.border})`,
  };
};

const stripColorOptions = (
  options: RenderOptions | undefined
): RenderOptions => {
  if (!options) {
    return {};
  }
  const { bg, fg, line, accent, muted, surface, border, ...rest } = options;
  return rest;
};

const selectThemeColors = (
  pair: ThemeColorsPair,
  mode: 'auto' | 'light' | 'dark'
): DiagramColors | undefined => {
  if (mode === 'dark') {
    return pair.dark ?? pair.light;
  }
  if (mode === 'light') {
    return pair.light ?? pair.dark;
  }
  return pair.light ?? pair.dark;
};

/**
 * Create a beautiful-mermaid plugin instance for rendering Mermaid diagrams.
 * This plugin uses beautiful-mermaid to generate SVG/ASCII outputs directly.
 */
export const createBeautifulMermaidPlugin = (
  options: BeautifulMermaidPluginOptions = {}
): MarkdownProcessorPlugin => {
  const {
    output = 'svg',
    classPrefix = 'beautiful-mermaid',
    includeId = true,
    svgOptions,
    asciiOptions,
    theme,
    themeMode = 'auto',
    themeStrategy,
    cssVarPrefix = '--mdc-bm',
  } = options;

  const wrapperClass = `${classPrefix}-wrapper`;
  const svgClass = `${classPrefix}-svg`;
  const asciiClass = `${classPrefix}-ascii`;
  const codeClass = `${classPrefix}-code`;
  const resolvedThemeStrategy =
    themeStrategy ?? (themeMode === 'auto' ? 'css-vars' : 'inline');
  const normalizedCssVarPrefix = normalizeCssVarPrefix(cssVarPrefix);
  const cssVarNames = buildCssVarNames(normalizedCssVarPrefix);

  const processBlock = async (
    content: string,
    context: MarkdownProcessorPluginContext
  ): Promise<string> => {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      context.logger.warn('Beautiful Mermaid plugin received empty content');
      return renderFallbackCodeBlock(content);
    }

    try {
      const module = await loadBeautifulMermaid();

      if (output === 'ascii') {
        const ascii = module.renderMermaidAscii(
          trimmedContent,
          resolveAsciiOptions(asciiOptions)
        );
        const escapedAscii = escapeHtml(ascii);
        const idAttribute = includeId ? ` id="${context.getUniqueId()}"` : '';
        return `<pre class="${wrapperClass} ${asciiClass}"${idAttribute}><code class="${codeClass}">${escapedAscii}</code></pre>`;
      }

      let renderOptions: RenderOptions | undefined = svgOptions;
      let wrapperStyle = '';
      let wrapperStyleBlock = '';
      let scopeId: string | undefined;
      let scopeAttribute = '';

      const themePair = theme
        ? await resolveThemeColorsPair(theme, module, context)
        : undefined;

      if (themePair) {
        if (resolvedThemeStrategy === 'inline') {
          if (themeMode === 'auto') {
            context.logger.warn(
              'Beautiful Mermaid plugin themeMode "auto" requires themeStrategy "css-vars". Falling back to light mode.'
            );
          }
          const selectedColors = selectThemeColors(
            themePair,
            themeMode === 'auto' ? 'light' : themeMode
          );
          renderOptions = {
            ...selectedColors,
            ...svgOptions,
          };
        } else {
          const baseOptions = stripColorOptions(svgOptions);
          renderOptions = {
            ...baseOptions,
            ...buildCssVarRenderOptions(cssVarNames),
          };

          const lightColors = themePair.light ?? themePair.dark;
          const darkColors = themePair.dark ?? themePair.light;
          const lightStyle = buildCssVarStyle(lightColors, cssVarNames);

          if (themeMode === 'auto') {
            const needsScopeId = true;
            if (needsScopeId) {
              scopeId = context.getUniqueId();
              if (includeId) {
                scopeAttribute = ` id="${scopeId}"`;
              } else {
                scopeAttribute = ` data-bm-scope="${scopeId}"`;
              }
            }

            wrapperStyle = lightStyle;

            const darkStyle = buildCssVarStyle(darkColors, cssVarNames);
            if (darkStyle && scopeId) {
              const selector = includeId
                ? `#${scopeId}`
                : `[data-bm-scope="${scopeId}"]`;
              wrapperStyleBlock = `<style>
  @media (prefers-color-scheme: dark) {
    ${selector} {
      ${darkStyle};
    }
  }
</style>`;
            }
          } else {
            const selectedColors = selectThemeColors(themePair, themeMode);
            wrapperStyle = buildCssVarStyle(selectedColors, cssVarNames);
          }
        }
      }

      if (!scopeAttribute && includeId) {
        scopeAttribute = ` id="${context.getUniqueId()}"`;
      }

      const styleAttribute = wrapperStyle ? ` style="${wrapperStyle}"` : '';
      const svg = await module.renderMermaid(trimmedContent, renderOptions);

      return `<div class="${wrapperClass} ${svgClass}"${scopeAttribute}${styleAttribute}>${wrapperStyleBlock}${svg}</div>`;
    } catch (error) {
      context.logger.warn(
        'Beautiful Mermaid plugin failed to render diagram:',
        error
      );
      return renderFallbackCodeBlock(content);
    }
  };

  return {
    name: 'mermaid',
    processBlock,
  };
};
