#!/usr/bin/env node
/**
 * MF-005: print the `integrity` value for a registry entry.
 *
 *   node scripts/registry-integrity.mjs path/to/entry.json
 *   node scripts/registry-integrity.mjs path/to/registry.json some-plugin
 *
 * The CLI verifies `sha256(JSON.stringify(entry.config))` — the exact bytes
 * that would be merged into ~/.mcode/config.json — so publishing a mismatch
 * would make `mcode add` refuse the entry.
 */
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const [file, name] = process.argv.slice(2);
if (!file) {
  console.error('usage: node scripts/registry-integrity.mjs <entry.json> [pluginName]');
  process.exit(2);
}

const doc = JSON.parse(await readFile(file, 'utf8'));
const entry = name
  ? (Array.isArray(doc) ? doc : (doc.plugins?.[name] || doc[name]))
  : doc;

if (!entry) {
  console.error(`entry not found: ${name} in ${file}`);
  process.exit(1);
}
const candidate = entry.config ?? entry;
const integrity = `sha256-${createHash('sha256').update(JSON.stringify(candidate), 'utf8').digest('hex')}`;
console.log(integrity);
if (entry.name) {
  console.log(`\nadd to your registry entry:\n  "integrity": "${integrity}"`);
}
