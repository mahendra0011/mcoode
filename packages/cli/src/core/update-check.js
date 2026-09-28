export async function checkForUpdate(currentVersion) {
  try {
    const res = await fetch('https://registry.npmjs.org/mcode-cli/latest', { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.version && data.version !== currentVersion) return data.version;
  } catch {}
  return null;
}
