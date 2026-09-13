/**
 * Developer tool runners: REST client, Live Server, SVG viewer, Draw.io.
 */

export function triggerLiveServerPreview(port: number = 5500): string {
  return `http://localhost:${port}`;
}

export function parseRestSnippet(text: string): { method: string; url: string } | null {
  const match = text.match(/^(GET|POST|PUT|DELETE|PATCH)\s+(\S+)/m);
  if (match) {
    return { method: match[1], url: match[2] };
  }
  return null;
}
