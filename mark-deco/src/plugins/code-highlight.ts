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
import type {
  CodeHighlightLanguage,
  CodeHighlightOptions,
  CodeHighlightTheme,
  CodeHighlightThemeConfig,
} from '../types';

const defaultCodeHighlightTheme = {
  light: 'github-light',
  dark: 'github-dark-dimmed',
} as const;

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

const buildAllowedLanguages = (
  languages: readonly CodeHighlightLanguage[]
):
  | { allowSet: Set<string>; allowList: Array<LanguageInput | string> }
  | undefined => {
  let hasLanguage = false;
  const allowSet = new Set<string>(['text']);
  const allowList: Array<LanguageInput | string> = ['text'];
  const allowListNames = new Set<string>(['text']);
  const registrationNames = new Set<string>();

  for (const language of languages) {
    if (typeof language === 'string') {
      const name = normalizeLanguageName(language);
      if (!name) {
        continue;
      }
      hasLanguage = true;
      allowSet.add(name);
      continue;
    }
    const name = normalizeLanguageName(language.name);
    if (!name) {
      continue;
    }
    hasLanguage = true;
    registrationNames.add(name);
    allowSet.add(name);
    if (Array.isArray(language.aliases)) {
      for (const alias of language.aliases) {
        const normalized = normalizeLanguageName(alias);
        if (normalized) {
          allowSet.add(normalized);
        }
      }
    }
    if (!allowListNames.has(name)) {
      allowList.push(language);
      allowListNames.add(name);
    }
  }

  for (const language of languages) {
    if (typeof language !== 'string') {
      continue;
    }
    const name = normalizeLanguageName(language);
    if (!name) {
      continue;
    }
    if (registrationNames.has(name)) {
      continue;
    }
    if (!allowListNames.has(name)) {
      allowList.push(name);
      allowListNames.add(name);
    }
  }

  if (!hasLanguage) {
    return undefined;
  }

  return { allowSet, allowList };
};

const createShikiHighlighter = (
  languages: readonly CodeHighlightLanguage[] | undefined
): RehypePrettyCodeOptions['getHighlighter'] | undefined => {
  if (!languages || languages.length === 0) {
    return undefined;
  }
  const resolved = buildAllowedLanguages(languages);
  if (!resolved) {
    return undefined;
  }
  const { allowSet, allowList } = resolved;

  return async (options: BundledHighlighterOptions<any, any>) => {
    const highlighter = await getSingletonHighlighter({
      ...options,
      langs: allowList,
    });
    const loadLanguage = highlighter.loadLanguage.bind(highlighter) as (
      ...langs: Array<LanguageInput | string>
    ) => Promise<void>;
    highlighter.loadLanguage = async (...langs) => {
      const filtered = langs.filter((lang) => {
        const rawName =
          typeof lang === 'string'
            ? lang
            : lang && typeof lang === 'object' && 'name' in lang
              ? String(lang.name)
              : '';
        const name = normalizeLanguageName(rawName);
        return !name || allowSet.has(name);
      });
      if (filtered.length === 0) {
        return;
      }
      return loadLanguage(...(filtered as Array<LanguageInput | string>));
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
      block: codeHighlight?.defaultLanguage ?? 'text',
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
