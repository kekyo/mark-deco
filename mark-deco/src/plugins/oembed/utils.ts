/**
 * Validate URL format
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Escape HTML characters
 */
export const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m] || m);
};

/**
 * Calculate aspect ratio from width and height
 */
export const calculateAspectRatio = (
  width?: number,
  height?: number
): number | null => {
  // When both are valid numbers
  if (width && height && width > 0 && height > 0) {
    const ratio = (height / width) * 100;
    // Limit extreme aspect ratios (range from 1:10 to 10:1)
    if (ratio >= 10 && ratio <= 1000) {
      return ratio;
    }
  }

  // When only one is provided, complement with 16:9
  if (width && width > 0 && (!height || height <= 0)) {
    // Width only: calculate height with 16:9
    const calculatedHeight = (width * 9) / 16;
    return (calculatedHeight / width) * 100; // = 56.25
  }

  if (height && height > 0 && (!width || width <= 0)) {
    // Height only: calculate width with 16:9
    const calculatedWidth = (height * 16) / 9;
    return (height / calculatedWidth) * 100; // = 56.25
  }

  return null;
};

/**
 * Extract aspect ratio from HTML iframe attributes
 */
export const extractAspectRatioFromHtml = (html: string): number | null => {
  // Target only the first iframe tag found
  const iframeMatch = html.match(/<iframe[^>]*>/i);
  if (!iframeMatch) return null;

  const firstIframe = iframeMatch[0];

  // Extract width attribute (numbers only)
  const widthMatch = firstIframe.match(/width=['"]?(\d+)['"]?/i);
  // Extract height attribute (numbers only)
  const heightMatch = firstIframe.match(/height=['"]?(\d+)['"]?/i);

  const width = widthMatch && widthMatch[1] ? parseInt(widthMatch[1], 10) : 0;
  const height =
    heightMatch && heightMatch[1] ? parseInt(heightMatch[1], 10) : 0;

  // Calculate using calculateAspectRatio (including 16:9 complement)
  // 0 is treated as undefined
  return calculateAspectRatio(width || undefined, height || undefined);
};
