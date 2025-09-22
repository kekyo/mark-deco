// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

/**
 * Generate responsive image HTML with inline styles for aspect ratio preservation
 */

/**
 * Generate inline styles for responsive images
 * These styles ensure images scale responsively while maintaining aspect ratio
 * and fit within their container using object-fit: contain (inscribed scaling)
 * Uses width: 100% to enable both scaling up and down to fit the container
 */
export const generateResponsiveImageStyles = (): string => {
  return 'width: 100%; height: auto; display: block; object-fit: contain; object-position: center;';
};

/**
 * Generate a responsive image tag with inline styles
 * @param src - Image source URL
 * @param alt - Alt text for accessibility
 * @param title - Optional title attribute
 * @param additionalAttrs - Additional HTML attributes as string
 * @returns Complete img tag with responsive styles
 */
export const createResponsiveImageTag = (
  src: string,
  alt: string,
  title?: string,
  additionalAttrs?: string
): string => {
  const styles = generateResponsiveImageStyles();
  const titleAttr = title ? ` title="${title}"` : '';
  const extraAttrs = additionalAttrs ? ` ${additionalAttrs}` : '';

  return `<img src="${src}" alt="${alt}"${titleAttr} style="${styles}"${extraAttrs} />`;
};

/**
 * Generate responsive image HTML wrapped in a container with aspect ratio preservation
 * @param src - Image source URL
 * @param alt - Alt text for accessibility
 * @param containerClass - CSS class for the container
 * @param title - Optional title attribute
 * @param additionalAttrs - Additional HTML attributes as string
 * @returns Complete responsive image HTML with container
 */
export const createResponsiveImageWithContainer = (
  src: string,
  alt: string,
  containerClass: string,
  title?: string,
  additionalAttrs?: string
): string => {
  const imageTag = createResponsiveImageTag(src, alt, title, additionalAttrs);

  return `<div class="${containerClass}">
      ${imageTag}
    </div>`;
};
