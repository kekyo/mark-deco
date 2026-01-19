// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import type { ResolveUrlContext } from '../types';

type ResolveUrl = (url: string, context: ResolveUrlContext) => string;

const urlAttributePattern =
  /\b(?:href|src|srcset|poster|data|action|formaction|cite|xlink:href)\s*=/i;

const urlAttributes = new Set([
  'href',
  'src',
  'srcset',
  'poster',
  'data',
  'action',
  'formaction',
  'cite',
  'xlink:href',
]);

const rawTextTags = new Set(['script', 'style', 'textarea', 'title']);

const isWhitespace = (char: string): boolean =>
  char === ' ' ||
  char === '\t' ||
  char === '\n' ||
  char === '\r' ||
  char === '\f';

const isNameChar = (char: string): boolean => /[A-Za-z0-9:_-]/.test(char);

const charAt = (value: string, index: number): string => value.charAt(index);

const rewriteSrcset = (
  value: string,
  tagName: string,
  resolveUrl: ResolveUrl
): string => {
  let i = 0;
  const length = value.length;
  let output = '';
  let changed = false;

  while (i < length) {
    const leadingStart = i;
    while (i < length && isWhitespace(charAt(value, i))) {
      i += 1;
    }
    output += value.slice(leadingStart, i);

    if (i >= length) {
      break;
    }

    let quote = '';
    let url = '';
    if (charAt(value, i) === '"' || charAt(value, i) === "'") {
      quote = charAt(value, i);
      i += 1;
      const urlStart = i;
      while (i < length && charAt(value, i) !== quote) {
        i += 1;
      }
      url = value.slice(urlStart, i);
      if (i < length) {
        i += 1;
      }
    } else {
      const urlStart = i;
      while (
        i < length &&
        !isWhitespace(charAt(value, i)) &&
        charAt(value, i) !== ','
      ) {
        i += 1;
      }
      url = value.slice(urlStart, i);
    }

    if (url.length === 0) {
      if (i < length && charAt(value, i) === ',') {
        output += ',';
        i += 1;
        continue;
      }
      break;
    }

    const updated = resolveUrl(url, {
      kind: 'html',
      tagName,
      attrName: 'srcset',
    });
    if (updated !== url) {
      changed = true;
    }
    if (quote) {
      output += `${quote}${updated}${quote}`;
    } else {
      output += updated;
    }

    const descriptorStart = i;
    while (i < length && charAt(value, i) !== ',') {
      i += 1;
    }
    output += value.slice(descriptorStart, i);

    if (i < length && charAt(value, i) === ',') {
      output += ',';
      i += 1;
    }
  }

  return changed ? output : value;
};

export const rewriteHtmlUrls = (
  html: string,
  resolveUrl: ResolveUrl
): string => {
  if (!urlAttributePattern.test(html)) {
    return html;
  }

  const length = html.length;
  let lowerHtml: string | null = null;
  let cursor = 0;
  let i = 0;
  let changed = false;
  const parts: string[] = [];

  const getLowerHtml = () => {
    if (!lowerHtml) {
      lowerHtml = html.toLowerCase();
    }
    return lowerHtml;
  };

  const commit = (end: number) => {
    if (end <= cursor) {
      return;
    }
    parts.push(html.slice(cursor, end));
    cursor = end;
  };

  while (i < length) {
    const ltIndex = html.indexOf('<', i);
    if (ltIndex < 0) {
      break;
    }
    i = ltIndex + 1;
    if (i >= length) {
      break;
    }

    const nextChar = charAt(html, i);
    if (nextChar === '!') {
      if (html.startsWith('!--', i)) {
        const end = html.indexOf('-->', i + 3);
        i = end >= 0 ? end + 3 : length;
        continue;
      }
      const end = html.indexOf('>', i + 1);
      if (end < 0) {
        break;
      }
      i = end + 1;
      continue;
    }

    if (nextChar === '?') {
      const end = html.indexOf('?>', i + 1);
      if (end < 0) {
        break;
      }
      i = end + 2;
      continue;
    }

    let isClosing = false;
    if (nextChar === '/') {
      isClosing = true;
      i += 1;
    }

    while (i < length && isWhitespace(charAt(html, i))) {
      i += 1;
    }

    const tagStart = i;
    while (i < length && isNameChar(charAt(html, i))) {
      i += 1;
    }
    if (i === tagStart) {
      continue;
    }

    const tagName = html.slice(tagStart, i);
    const tagNameLower = tagName.toLowerCase();

    if (isClosing) {
      const end = html.indexOf('>', i);
      if (end < 0) {
        break;
      }
      i = end + 1;
      continue;
    }

    let isSelfClosing = false;
    while (i < length) {
      const char = charAt(html, i);
      if (char === '>') {
        i += 1;
        break;
      }
      if (char === '/' && charAt(html, i + 1) === '>') {
        isSelfClosing = true;
        i += 2;
        break;
      }
      if (isWhitespace(char)) {
        i += 1;
        continue;
      }

      const attrStart = i;
      while (i < length && isNameChar(charAt(html, i))) {
        i += 1;
      }
      if (i === attrStart) {
        i += 1;
        continue;
      }
      const attrName = html.slice(attrStart, i);
      const attrNameLower = attrName.toLowerCase();

      while (i < length && isWhitespace(charAt(html, i))) {
        i += 1;
      }
      if (charAt(html, i) !== '=') {
        continue;
      }

      i += 1;
      while (i < length && isWhitespace(charAt(html, i))) {
        i += 1;
      }
      if (i >= length) {
        break;
      }

      let quote = '';
      let valueStart = i;
      let valueEnd = i;
      if (charAt(html, i) === '"' || charAt(html, i) === "'") {
        quote = charAt(html, i);
        valueStart = i + 1;
        const closing = html.indexOf(quote, valueStart);
        if (closing < 0) {
          return html;
        }
        valueEnd = closing;
        i = closing + 1;
      } else {
        valueStart = i;
        while (
          i < length &&
          !isWhitespace(charAt(html, i)) &&
          charAt(html, i) !== '>' &&
          !(charAt(html, i) === '/' && charAt(html, i + 1) === '>')
        ) {
          i += 1;
        }
        valueEnd = i;
      }

      if (!urlAttributes.has(attrNameLower)) {
        continue;
      }

      const original = html.slice(valueStart, valueEnd);
      let updated = original;
      if (attrNameLower === 'srcset') {
        updated = rewriteSrcset(original, tagNameLower, resolveUrl);
      } else {
        updated = resolveUrl(original, {
          kind: 'html',
          tagName: tagNameLower,
          attrName: attrNameLower,
        });
      }

      if (updated !== original) {
        changed = true;
        commit(valueStart);
        parts.push(updated);
        cursor = valueEnd;
      }
    }

    if (!isSelfClosing && rawTextTags.has(tagNameLower)) {
      const lower = getLowerHtml();
      const closeIndex = lower.indexOf(`</${tagNameLower}`, i);
      if (closeIndex < 0) {
        break;
      }
      const closeEnd = html.indexOf('>', closeIndex + 2);
      if (closeEnd < 0) {
        break;
      }
      i = closeEnd + 1;
    }
  }

  if (!changed) {
    return html;
  }

  parts.push(html.slice(cursor));
  return parts.join('');
};
