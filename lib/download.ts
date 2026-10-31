/** Saves text as a file through a temporary object URL. */
export function download(name: string, text: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function readFileText(file: File): Promise<string> {
  return file.text();
}

/** Only http(s) links are opened or linked (no javascript: or data: URLs). */
export function safeUrl(u?: string | null): string | undefined {
  const s = (u ?? '').trim();
  return /^https?:\/\//i.test(s) ? s : undefined;
}
