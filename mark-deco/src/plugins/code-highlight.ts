// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import * as rehypePrettyCodeModule from 'rehype-pretty-code';
import {
  type Options as RehypePrettyCodeOptions,
  type Theme as RehypePrettyCodeTheme,
} from 'rehype-pretty-code';
import {
  type BundledHighlighterOptions,
  getSingletonHighlighter,
  type LanguageInput,
  type LanguageRegistration,
} from 'shiki';
import type {
  CodeHighlightOptions,
  CodeHighlightTheme,
  CodeHighlightThemeConfig,
} from '../types';
import { resolveDefaultExport } from '../utils';

const defaultCodeHighlightTheme = {
  light: 'github-light',
  dark: 'github-dark-dimmed',
} as const;

const rehypePrettyCode = resolveDefaultExport(rehypePrettyCodeModule);

const coerceTheme = (theme: CodeHighlightTheme): RehypePrettyCodeTheme => {
  if (typeof theme === 'string') {
    return theme as RehypePrettyCodeTheme;
  }
  if ('tokenColors' in theme && theme.tokenColors) {
    return theme as RehypePrettyCodeTheme;
  }
  if ('settings' in theme) {
    return {
      ...theme,
      tokenColors: theme.settings,
    } as RehypePrettyCodeTheme;
  }
  return theme as RehypePrettyCodeTheme;
};

const isThemeConfig = (
  theme: CodeHighlightOptions['theme']
): theme is CodeHighlightThemeConfig => {
  return (
    typeof theme === 'object' &&
    theme !== null &&
    ('light' in theme || 'dark' in theme)
  );
};

const codeMetaBraceToken = {
  left: '__mtr_code_meta_lbrace__',
  right: '__mtr_code_meta_rbrace__',
} as const;

const escapeCodeMetaBraces = (meta: string): string => {
  if (!meta.includes('{') && !meta.includes('}')) {
    return meta;
  }
  return meta
    .replace(/\{/g, codeMetaBraceToken.left)
    .replace(/\}/g, codeMetaBraceToken.right);
};

const restoreCodeMetaBraces = (meta: string): string => {
  if (
    !meta.includes(codeMetaBraceToken.left) &&
    !meta.includes(codeMetaBraceToken.right)
  ) {
    return meta;
  }
  return meta
    .split(codeMetaBraceToken.left)
    .join('{')
    .split(codeMetaBraceToken.right)
    .join('}');
};

const protectCodeMeta = (node: any): void => {
  if (!node || typeof node !== 'object') {
    return;
  }
  if (node.type === 'code' && typeof node.meta === 'string') {
    node.meta = escapeCodeMetaBraces(node.meta);
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      protectCodeMeta(child);
    }
  }
};

export const remarkProtectCodeMeta = () => {
  return (tree: any) => {
    // Prevent remark-attr from consuming rehype-pretty-code meta.
    protectCodeMeta(tree);
  };
};

type ResolvedTheme = Exclude<RehypePrettyCodeOptions['theme'], undefined>;
type MetaFilter = Exclude<
  RehypePrettyCodeOptions['filterMetaString'],
  undefined
>;

const resolveCodeHighlightTheme = (
  theme: CodeHighlightOptions['theme'] | undefined
): ResolvedTheme => {
  if (theme === undefined) {
    return defaultCodeHighlightTheme;
  }
  if (typeof theme === 'string') {
    return coerceTheme(theme);
  }
  if (!isThemeConfig(theme)) {
    return coerceTheme(theme);
  }
  return {
    light: coerceTheme(theme.light ?? defaultCodeHighlightTheme.light),
    dark: coerceTheme(theme.dark ?? defaultCodeHighlightTheme.dark),
  };
};

const createMetaFilter = (lineNumbers: boolean): MetaFilter => {
  return (meta) => {
    const restored = restoreCodeMetaBraces(meta);
    const trimmed = restored.trim();
    if (!lineNumbers) {
      return trimmed;
    }
    if (/\bshowLineNumbers\b/.test(trimmed)) {
      return trimmed;
    }
    return trimmed.length > 0
      ? `showLineNumbers ${trimmed}`
      : 'showLineNumbers';
  };
};

const normalizeLanguageName = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeLanguageDefinitions = (
  definitions: readonly LanguageRegistration[] | undefined
): LanguageRegistration[] => {
  if (!definitions || definitions.length === 0) {
    return [];
  }
  const normalized = new Map<string, LanguageRegistration>();
  for (const definition of definitions) {
    const name = normalizeLanguageName(definition.name);
    if (!name) {
      continue;
    }
    if (normalized.has(name)) {
      normalized.delete(name);
    }
    normalized.set(name, definition);
  }
  return Array.from(normalized.values());
};

const normalizeLanguageAliases = (
  aliases: Record<string, string> | undefined
): Record<string, string> | undefined => {
  if (!aliases) {
    return undefined;
  }
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(aliases)) {
    const from = normalizeLanguageName(key);
    const to = normalizeLanguageName(value);
    if (!from || !to) {
      continue;
    }
    normalized[from] = to;
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const buildCustomLanguageMap = (
  definitions: readonly LanguageRegistration[]
): Map<string, LanguageRegistration> => {
  const customLanguages = new Map<string, LanguageRegistration>();
  for (const definition of definitions) {
    const name = normalizeLanguageName(definition.name);
    if (!name) {
      continue;
    }
    if (customLanguages.has(name)) {
      customLanguages.delete(name);
    }
    customLanguages.set(name, definition);
    if (Array.isArray(definition.aliases)) {
      for (const alias of definition.aliases) {
        const normalized = normalizeLanguageName(alias);
        if (!normalized) {
          continue;
        }
        if (customLanguages.has(normalized)) {
          customLanguages.delete(normalized);
        }
        customLanguages.set(normalized, definition);
      }
    }
  }
  return customLanguages;
};

const resolveLanguageAlias = (
  name: string,
  aliases: Record<string, string> | undefined
): string => {
  if (!aliases) {
    return name;
  }
  let current = name;
  const seen = new Set<string>();
  while (aliases[current]) {
    if (seen.has(current)) {
      break;
    }
    seen.add(current);
    const next = aliases[current];
    if (!next || next === current) {
      break;
    }
    current = next;
  }
  return current;
};

const resolveLanguageName = (
  name: string,
  customLanguageMap: Map<string, LanguageRegistration> | undefined,
  aliases: Record<string, string> | undefined
): string => {
  const normalized = normalizeLanguageName(name);
  if (!normalized) {
    return name;
  }
  const directCustom = customLanguageMap?.get(normalized);
  if (directCustom) {
    return directCustom.name;
  }
  const resolvedAlias = resolveLanguageAlias(normalized, aliases);
  const aliasedCustom = customLanguageMap?.get(resolvedAlias);
  if (aliasedCustom) {
    return aliasedCustom.name;
  }
  return resolvedAlias;
};

const resolveLanguageInput = (
  name: string,
  customLanguageMap: Map<string, LanguageRegistration> | undefined,
  aliases: Record<string, string> | undefined
): LanguageInput | string => {
  const normalized = normalizeLanguageName(name);
  if (!normalized) {
    return name;
  }
  const directCustom = customLanguageMap?.get(normalized);
  if (directCustom) {
    return directCustom;
  }
  const resolvedAlias = resolveLanguageAlias(normalized, aliases);
  const aliasedCustom = customLanguageMap?.get(resolvedAlias);
  if (aliasedCustom) {
    return aliasedCustom;
  }
  return resolvedAlias;
};

const createShikiHighlighter = (
  languageDefinitions: readonly LanguageRegistration[] | undefined,
  languageAliases: Record<string, string> | undefined
): RehypePrettyCodeOptions['getHighlighter'] | undefined => {
  const normalizedDefinitions =
    normalizeLanguageDefinitions(languageDefinitions);
  const normalizedAliases = normalizeLanguageAliases(languageAliases);
  if (normalizedDefinitions.length === 0 && !normalizedAliases) {
    return undefined;
  }
  const customLanguageMap =
    normalizedDefinitions.length > 0
      ? buildCustomLanguageMap(normalizedDefinitions)
      : undefined;

  return async (options: BundledHighlighterOptions<any, any>) => {
    const { langAlias, langs, ...rest } = options;
    const mergedLangs =
      normalizedDefinitions.length > 0
        ? [...langs, ...normalizedDefinitions]
        : langs;
    const mergedLangAlias = normalizedAliases
      ? { ...langAlias, ...normalizedAliases }
      : langAlias;
    const highlighter = await getSingletonHighlighter({
      ...rest,
      langs: mergedLangs,
      ...(mergedLangAlias ? { langAlias: mergedLangAlias } : {}),
    });
    if (
      (customLanguageMap && customLanguageMap.size > 0) ||
      normalizedAliases
    ) {
      const loadLanguage = highlighter.loadLanguage.bind(highlighter) as (
        ...langs: Array<LanguageInput | string>
      ) => Promise<void>;
      highlighter.loadLanguage = async (...langs) => {
        const resolved: Array<LanguageInput | string> = [];
        for (const lang of langs) {
          if (typeof lang !== 'string') {
            resolved.push(lang);
            continue;
          }
          resolved.push(
            resolveLanguageInput(lang, customLanguageMap, normalizedAliases)
          );
        }
        return loadLanguage(...resolved);
      };
      const codeToHtml = highlighter.codeToHtml.bind(
        highlighter
      ) as typeof highlighter.codeToHtml;
      highlighter.codeToHtml = (code, options) => {
        if (!options || typeof options !== 'object') {
          return codeToHtml(code, options as any);
        }
        const lang = (options as { lang?: string }).lang;
        if (typeof lang !== 'string') {
          return codeToHtml(code, options as any);
        }
        const resolvedLang = resolveLanguageName(
          lang,
          customLanguageMap,
          normalizedAliases
        );
        if (resolvedLang === lang) {
          return codeToHtml(code, options as any);
        }
        return codeToHtml(code, { ...options, lang: resolvedLang });
      };
    }
    return highlighter;
  };
};

const createCodeHighlightOptions = (
  codeHighlight: CodeHighlightOptions | undefined
): RehypePrettyCodeOptions => {
  const options: RehypePrettyCodeOptions = {
    theme: resolveCodeHighlightTheme(codeHighlight?.theme),
    defaultLang: {
      block: codeHighlight?.defaultLanguage ?? 'text',
    },
    keepBackground: true,
    filterMetaString: createMetaFilter(codeHighlight?.lineNumbers === true),
  };
  const highlighter = createShikiHighlighter(
    codeHighlight?.languageDefinitions,
    codeHighlight?.languageAliases
  );
  if (highlighter) {
    options.getHighlighter = highlighter;
  }
  return options;
};

export const createCodeHighlightRehypePlugin = (
  codeHighlight: CodeHighlightOptions | undefined
): [typeof rehypePrettyCode, RehypePrettyCodeOptions] => {
  return [rehypePrettyCode, createCodeHighlightOptions(codeHighlight)];
};
