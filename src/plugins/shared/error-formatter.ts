/**
 * Format error information in a consistent way across browsers
 * Attempts to use error constructor name and message, falls back to toString()
 */
export const formatErrorInfo = (error: unknown): string | undefined => {
  if (!error) {
    return undefined;
  }

  try {
    // Try to extract constructor name and message
    if (error instanceof Error) {
      const typeName = error.constructor?.name || 'Error';
      const message = error.message || '';

      if (message) {
        // Format as: TypeName[message]
        return `${typeName}[${message}]`;
      } else {
        // Format as: TypeName (no message available)
        return typeName;
      }
    }

    // For non-Error objects, try to get constructor name
    if (typeof error === 'object' && error !== null) {
      const typeName = (error as { constructor?: { name?: string } }).constructor?.name;
      if (typeName && typeName !== 'Object') {
        const message = (error as { message?: string }).message;
        if (message) {
          return `${typeName}[${message}]`;
        } else {
          return typeName;
        }
      }
    }

    // Fall back to toString() if we can't get structured information
    return String(error);
  } catch {
    // If all else fails, use toString() as ultimate fallback
    try {
      return String(error);
    } catch {
      // If even toString() fails, return a safe default
      return 'Unknown error';
    }
  }
};
