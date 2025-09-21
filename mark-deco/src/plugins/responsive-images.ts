/**
 * Rehype plugin to make standard markdown images responsive
 */
import { visit } from 'unist-util-visit';
import { generateResponsiveImageStyles } from '../utils/responsive-image.js';
import type { Element } from 'hast';

/**
 * Rehype plugin that adds responsive styles to all img tags
 * This plugin processes the HTML AST and adds inline styles to img elements
 * to make them responsive while preserving aspect ratio
 */
export const rehypeResponsiveImages = () => {
  return (tree: any) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'img') {
        const responsiveStyles = generateResponsiveImageStyles();

        // Initialize properties object if it doesn't exist
        if (!node.properties) {
          node.properties = {};
        }

        // Get existing style attribute if any
        const existingStyle = (node.properties.style as string) || '';

        // Combine existing styles with responsive styles
        const combinedStyles = existingStyle
          ? `${existingStyle}; ${responsiveStyles}`
          : responsiveStyles;

        // Set the combined styles
        node.properties.style = combinedStyles;
      }
    });
  };
};
