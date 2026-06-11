import DOMPurify from 'isomorphic-dompurify';

// Shared HTML sanitizer for any content rendered via dangerouslySetInnerHTML.
// Defense in depth: the server sanitizes on write, this guards on render.
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html);
}
