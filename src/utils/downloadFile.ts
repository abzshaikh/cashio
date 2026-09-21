/**
 * Triggers a browser download of in-memory text content — used by Phase
 * 29's transaction CSV export. There's no library involved (an
 * object-URL-backed anchor click is the standard, dependency-free way to
 * do this in a browser) and nothing else in the app needed it before now;
 * the PDF exports don't use this — `jsPDF`'s own `.save()` already
 * handles triggering its download.
 */
export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = 'text/csv;charset=utf-8',
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
