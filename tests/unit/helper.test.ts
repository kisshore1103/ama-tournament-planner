import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
const load = (name: string) => {
  document.body.innerHTML = readFileSync(`fixtures/sportdata/${name}.html`, 'utf8')
    .replace(/^[\s\S]*<body>/, '')
    .replace(/<\/body>[\s\S]*$/, '');
  document.title = name === 'verification' ? 'Verification' : 'Fixture Cup';
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});
async function helper(fixture: string) {
  vi.resetModules();
  load(fixture);
  vi.stubGlobal('location', {
    hostname: 'sportdata.org',
    protocol: 'https:',
    href: 'https://sportdata.org/karate/set-online/entries.php?vernr=90001',
  });
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  const storage = new Map();
  const save = vi.fn((key: string, value: unknown) => storage.set(key, value));
  vi.stubGlobal('GM_setValue', save);
  vi.stubGlobal('GM_getValue', (key: string, fallback: unknown) => storage.get(key) || fallback);
  vi.stubGlobal('GM_deleteValue', (key: string) => storage.delete(key));
  await import('@/lib/capture/helper');
  const control = document.getElementById('ama-capture-control') as HTMLDetailsElement;
  return { control, save };
}
describe('visible explicit-tap helper', () => {
  it('does not capture on injection or expansion, only the capture tap', async () => {
    const { control, save } = await helper('entries');
    expect(save).not.toHaveBeenCalled();
    control.open = true;
    control.dispatchEvent(new Event('toggle'));
    expect(save).not.toHaveBeenCalled();
    const button = Array.from(control.querySelectorAll('button')).find(
      (b) => b.textContent === 'Capture Current Page',
    )!;
    button.click();
    expect(save).toHaveBeenCalledTimes(1);
    const data = save.mock.calls[0][1];
    expect(JSON.stringify(data)).not.toContain('<table');
  });
  it('shows only Close and never captures a verification page', async () => {
    const { control, save } = await helper('verification');
    control.open = true;
    control.dispatchEvent(new Event('toggle'));
    expect(Array.from(control.querySelectorAll('button')).map((b) => b.textContent)).toEqual([
      'Close',
    ]);
    expect(save).not.toHaveBeenCalled();
  });
  it('refuses a capture if the page becomes hidden', async () => {
    const { control, save } = await helper('entries');
    control.open = true;
    control.dispatchEvent(new Event('toggle'));
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    Array.from(control.querySelectorAll('button'))
      .find((b) => b.textContent === 'Capture Current Page')!
      .click();
    expect(save).not.toHaveBeenCalled();
  });
});
