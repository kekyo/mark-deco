// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import rehypePrettyCode, {
  type Options as RehypePrettyCodeOptions,
  type Theme as RehypePrettyCodeTheme,
} from 'rehype-pretty-code';
import {
  type BundledHighlighterOptions,
  getSingletonHighlighter,
  type LanguageInput,
} from 'shiki';
import type { CodeHighlightOptions } from '../types';

const defaultCodeHighlightTheme = {
  light: 'github-light',
  dark: 'github-dark-dimmed',
} as const;

const coerceTheme = (theme: string): RehypePrettyCodeTheme =>
  theme as RehypePrettyCodeTheme;

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

const createShikiHighlighter = (
  languages: readonly string[] | undefined
): RehypePrettyCodeOptions['getHighlighter'] | undefined => {
  if (!languages || languages.length === 0) {
    return undefined;
  }
  const normalized = languages
    .map((language) => language.trim())
    .filter((language) => language.length > 0);
  if (normalized.length === 0) {
    return undefined;
  }
  const allowSet = new Set<string>(['plaintext', ...normalized]);
  const allowList = Array.from(allowSet);

  return async (options: BundledHighlighterOptions<any, any>) => {
    const highlighter = await getSingletonHighlighter({
      ...options,
      langs: allowList,
    });
    const loadLanguage = highlighter.loadLanguage.bind(highlighter);
    highlighter.loadLanguage = async (...langs) => {
      const filtered = langs.filter((lang) => {
        const name =
          typeof lang === 'string'
            ? lang
            : lang && typeof lang === 'object' && 'name' in lang
              ? String(lang.name)
              : '';
        return !name || allowSet.has(name);
      });
      if (filtered.length === 0) {
        return;
      }
      return loadLanguage(...(filtered as LanguageInput[]));
    };
    return highlighter;
  };
};

const createCodeHighlightOptions = (
  codeHighlight: CodeHighlightOptions | undefined
): RehypePrettyCodeOptions => {
  const options: RehypePrettyCodeOptions = {
    theme: resolveCodeHighlightTheme(codeHighlight?.theme),
    defaultLang: {
      block: codeHighlight?.defaultLanguage ?? 'plaintext',
    },
    keepBackground: true,
    filterMetaString: createMetaFilter(codeHighlight?.lineNumbers === true),
  };
  const highlighter = createShikiHighlighter(codeHighlight?.languages);
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
