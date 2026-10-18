export function checkedLabel(iso: string, now: number) {
  if (!iso) return 'Not checked yet';
  const elapsed = Math.max(0, now - Date.parse(iso));
  if (elapsed < 60000) return 'Checked just now';
  if (elapsed < 3600000) return `Checked ${Math.floor(elapsed / 60000)} minutes ago`;
  if (elapsed < 86400000) return `Checked ${Math.floor(elapsed / 3600000)} hours ago`;
  return `Checked ${Math.floor(elapsed / 86400000)} days ago`;
}
