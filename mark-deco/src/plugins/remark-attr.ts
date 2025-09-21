import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';
import type { Plugin } from 'unified';

/**
 * Parse attribute string like "{.class #id data-attr=value}"
 */
const parseAttributes = (attrStr: string): Record<string, string> => {
  const attributes: Record<string, string> = {};

  // Remove curly braces
  const content = attrStr.slice(1, -1).trim();

  // Handle classes (.class)
  const classMatches = content.match(/\.([a-zA-Z0-9_-]+)/g);
  if (classMatches) {
    const classes = classMatches.map((match) => match.slice(1));
    attributes.class = classes.join(' ');
  }

  // Handle ID (#id)
  const idMatch = content.match(/#([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    attributes.id = idMatch[1];
  }

  // Handle key=value pairs
  const attrMatches = content.match(/([a-zA-Z0-9_-]+)=["']?([^"'\s]*)["']?/g);
  if (attrMatches) {
    for (const attr of attrMatches) {
      const [key, value] = attr.split('=');
      if (key && value && key !== 'class' && key !== 'id') {
        attributes[key] = value.replace(/["']/g, '');
      }
    }
  }

  return attributes;
};

/**
 * Generate HTML for a code block
 */
const generateCodeBlockHTML = (node: any): string => {
  const lang = node.lang ? ` class="language-${node.lang}"` : '';
  const code = node.value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<pre><code${lang}>${code}</code></pre>`;
};

/**
 * Apply attributes to a node
 */
const applyAttributes = (node: any, attributes: Record<string, string>) => {
  if (!node.data) {
    node.data = {};
  }
  if (!node.data.hProperties) {
    node.data.hProperties = {};
  }

  // Merge attributes, handling class specially
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'class') {
      // Merge with existing classes
      const existingClass = node.data.hProperties.class;
      if (existingClass) {
        // For code blocks, ensure language-* comes first, then custom classes
        if (
          typeof existingClass === 'string' &&
          existingClass.startsWith('language-')
        ) {
          node.data.hProperties.class = `${existingClass} ${value}`;
        } else {
          node.data.hProperties.class = `${existingClass} ${value}`;
        }
      } else {
        node.data.hProperties.class = value;
      }
    } else {
      node.data.hProperties[key] = value;
    }
  });
};

/**
 * Lightweight remark plugin to add CSS attribute support
 * Supports syntax like: # Heading {.class #id data-attr=value}
 */
export const remarkAttr: Plugin<[], Root> = () => {
  return (tree: Root) => {
    visit(tree, (node: any, index: number | undefined, parent: any) => {
      // Handle headings with attributes in text
      if (node.type === 'heading' && node.children?.length > 0) {
        const lastChild = node.children[node.children.length - 1];
        if (lastChild?.type === 'text' && lastChild.value) {
          const match = lastChild.value.match(/^(.*?)\s*(\{[^}]+\})\s*$/);
          if (match) {
            const cleanText = match[1].trim();
            const attrStr = match[2];
            const attributes = parseAttributes(attrStr);
            lastChild.value = cleanText;
            applyAttributes(node, attributes);
          }
        }
      }

      // Handle paragraphs with attributes in text
      if (node.type === 'paragraph' && node.children?.length > 0) {
        const lastChild = node.children[node.children.length - 1];
        if (lastChild?.type === 'text' && lastChild.value) {
          const match = lastChild.value.match(/^(.*?)\s*(\{[^}]+\})\s*$/);
          if (match) {
            const cleanText = match[1].trim();
            const attrStr = match[2];
            const attributes = parseAttributes(attrStr);
            lastChild.value = cleanText;
            applyAttributes(node, attributes);
          }
        }
      }

      // Handle links with attributes following them
      if (node.type === 'link' && parent && typeof index === 'number') {
        const nextSibling = parent.children[index + 1];
        if (nextSibling?.type === 'text' && nextSibling.value) {
          const match = nextSibling.value.match(/^\s*(\{[^}]+\})/);
          if (match) {
            const attrStr = match[1];
            const attributes = parseAttributes(attrStr);
            applyAttributes(node, attributes);
            // Remove the attribute text from the next sibling
            nextSibling.value = nextSibling.value.replace(match[0], '');
          }
        }
      }

      // Handle images with attributes following them
      if (node.type === 'image' && parent && typeof index === 'number') {
        const nextSibling = parent.children[index + 1];
        if (nextSibling?.type === 'text' && nextSibling.value) {
          const match = nextSibling.value.match(/^\s*(\{[^}]+\})/);
          if (match) {
            const attrStr = match[1];
            const attributes = parseAttributes(attrStr);
            applyAttributes(node, attributes);
            // Remove the attribute text from the next sibling
            nextSibling.value = nextSibling.value.replace(match[0], '');
          }
        }
      }

      // Handle list items with attributes in text
      if (node.type === 'listItem' && node.children?.length > 0) {
        const lastChild = node.children[node.children.length - 1];
        if (lastChild?.type === 'paragraph' && lastChild.children?.length > 0) {
          const lastTextNode =
            lastChild.children[lastChild.children.length - 1];
          if (lastTextNode?.type === 'text' && lastTextNode.value) {
            const match = lastTextNode.value.match(/^(.*?)\s*(\{[^}]+\})\s*$/);
            if (match) {
              const cleanText = match[1].trim();
              const attrStr = match[2];
              const attributes = parseAttributes(attrStr);
              lastTextNode.value = cleanText;
              applyAttributes(node, attributes);
            }
          }
        }
      }

      // Handle lists with attributes on separate lines
      if (node.type === 'list' && parent && typeof index === 'number') {
        const nextSibling = parent.children[index + 1];
        if (
          nextSibling?.type === 'paragraph' &&
          nextSibling.children?.length === 1
        ) {
          const textNode = nextSibling.children[0];
          if (textNode?.type === 'text' && textNode.value) {
            const match = textNode.value.match(/^\s*(\{[^}]+\})\s*$/);
            if (match) {
              const attrStr = match[1];
              const attributes = parseAttributes(attrStr);
              applyAttributes(node, attributes);
              // Remove the attribute paragraph
              parent.children.splice(index + 1, 1);
            }
          }
        }
      }

      // Handle blockquotes with attributes in text
      if (node.type === 'blockquote' && node.children?.length > 0) {
        const lastChild = node.children[node.children.length - 1];
        if (lastChild?.type === 'paragraph' && lastChild.children?.length > 0) {
          const lastTextNode =
            lastChild.children[lastChild.children.length - 1];
          if (lastTextNode?.type === 'text' && lastTextNode.value) {
            const match = lastTextNode.value.match(/^(.*?)\s*(\{[^}]+\})\s*$/);
            if (match) {
              const cleanText = match[1].trim();
              const attrStr = match[2];
              const attributes = parseAttributes(attrStr);
              lastTextNode.value = cleanText;
              applyAttributes(node, attributes);
            }
          }
        }
      }

      // Handle blockquotes with attributes on separate lines
      if (node.type === 'blockquote' && parent && typeof index === 'number') {
        const nextSibling = parent.children[index + 1];
        if (
          nextSibling?.type === 'paragraph' &&
          nextSibling.children?.length === 1
        ) {
          const textNode = nextSibling.children[0];
          if (textNode?.type === 'text' && textNode.value) {
            const match = textNode.value.match(/^\s*(\{[^}]+\})\s*$/);
            if (match) {
              const attrStr = match[1];
              const attributes = parseAttributes(attrStr);
              applyAttributes(node, attributes);
              // Remove the attribute paragraph
              parent.children.splice(index + 1, 1);
            }
          }
        }
      }

      // Handle inline code with attributes following them
      if (node.type === 'inlineCode' && parent && typeof index === 'number') {
        const nextSibling = parent.children[index + 1];
        if (nextSibling?.type === 'text' && nextSibling.value) {
          const match = nextSibling.value.match(/^\s*(\{[^}]+\})/);
          if (match) {
            const attrStr = match[1];
            const attributes = parseAttributes(attrStr);
            applyAttributes(node, attributes);
            // Remove the attribute text from the next sibling
            nextSibling.value = nextSibling.value.replace(match[0], '');
          }
        }
      }

      // Handle code blocks with attributes in meta
      if (node.type === 'code' && node.meta) {
        const match = node.meta.match(/\{([^}]+)\}/);
        if (match) {
          const attrStr = `{${match[1]}}`;
          const attributes = parseAttributes(attrStr);

          // Create a wrapper div to protect attributes from highlight.js
          const wrapperDiv = {
            type: 'html',
            value: `<div class="${attributes.class || ''}" ${Object.entries(
              attributes
            )
              .filter(([key]) => key !== 'class')
              .map(([key, value]) => `${key}="${value}"`)
              .join(' ')}>${generateCodeBlockHTML(node)}</div>`,
          };

          // Replace the code block with the wrapper div
          if (parent && typeof index === 'number') {
            parent.children[index] = wrapperDiv;
          }

          // Remove the attribute from meta but keep language
          node.meta = node.meta.replace(match[0], '').trim() || null;
        }
      }
    });
  };
};
