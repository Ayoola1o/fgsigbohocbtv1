export async function printDocument(target: Window) {
  if (target.closed) return;
  const doc = target.document;
  if (doc.querySelector('[data-print-ready="false"]')) { target.alert('Report settings are still loading or failed to load. Please retry.'); return; }
  const assets = [doc.fonts.ready, ...Array.from(doc.images).map(image => image.decode().catch(() => undefined)),
    ...Array.from(doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).map(link => link.sheet ? Promise.resolve() : new Promise<void>((resolve, reject) => {
      link.addEventListener('load', () => resolve(), { once: true });
      link.addEventListener('error', () => reject(new Error('Stylesheet failed to load')), { once: true });
    }))];
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([Promise.all(assets), new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Print assets are still loading. Please retry.')), 15000); })]);
    if (!target.closed) { target.focus(); target.print(); }
  } catch (error) {
    target.alert(error instanceof Error ? error.message : 'Unable to prepare printing. Please retry.');
  } finally { clearTimeout(timeout); }
}
