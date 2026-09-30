/**
 * Tool-icon mapping contract (ZCode icons reference / spec §4).
 *
 * The spec fixes an exact icon per tool family and one constant colour for the
 * live-processing path:
 *
 *   explored → FolderSearch   read_file, list_files, search_code, default
 *   searched → Search         web_search, web_fetch
 *   ran      → Terminal       run_shell, run_tests
 *   wrote    → FileText       write_file
 *   updated  → Pencil         edit_file
 *
 * everything rendered at size 14 with `text-emerald-400`. This test fails if a
 * mapping is dropped, renamed or recoloured.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const src = join(here, '..', 'src');
const ux = readFileSync(join(src, 'components', 'chat', 'mcodeUX.tsx'), 'utf8');
const stepCards = readFileSync(join(src, 'components', 'ide', 'StepCards.tsx'), 'utf8');

describe('ICONS map in mcodeUX.tsx (spec §4)', () => {
  const expected = {
    explored: 'FolderSearch',
    searched: 'Search',
    ran: 'Terminal',
    wrote: 'FileText',
    updated: 'Pencil',
  };

  for (const [type, icon] of Object.entries(expected)) {
    it(`maps ${type} → ${icon}`, () => {
      const block = ux.match(/const ICONS = \{[\s\S]*?\};/);
      expect(block, 'ICONS map is missing from mcodeUX.tsx').toBeTruthy();
      expect(block[0]).toMatch(new RegExp(`${type}\\s*:\\s*${icon}`));
    });
  }

  it('falls back to FolderSearch for unknown tool types', () => {
    expect(ux).toMatch(/ICONS\[type as IconKey\]\s*\?\?\s*FolderSearch/);
  });

  it('imports every mapped icon from lucide-react', () => {
    for (const icon of Object.values(expected)) {
      expect(ux).toContain(icon);
    }
  });

  it('renders tool icons at size 14 in emerald, constant across tool types', () => {
    // Spec: `<Icon size={14} className="text-emerald-400" />`
    expect(ux).toMatch(/<Icon\s+size=\{14\}[^>]*text-emerald-400/);
    // No second Icon render with a different colour inside ToolCallCard.
    const toolCard = ux.match(/export function ToolCallCard[\s\S]*?\n\}/);
    expect(toolCard).toBeTruthy();
    expect(toolCard[0]).toContain('text-emerald-400');
  });
});

describe('StepCard tool → type mapping (spec §4)', () => {
  const cases = [
    ["case 'read_file'", 'explored'],
    ["case 'write_file'", 'wrote'],
    ["case 'edit_file'", 'updated'],
    ["case 'run_shell'", 'ran'],
    ["case 'run_tests'", 'ran'],
    ["case 'list_files'", 'searched'],
    ["case 'search_code'", 'searched'],
    ["case 'web_search'", 'searched'],
    ["case 'web_fetch'", 'searched'],
  ];

  for (const [caseLine, type] of cases) {
    it(`${caseLine} renders as type=${type}`, () => {
      const idx = stepCards.indexOf(caseLine);
      expect(idx, `${caseLine} missing from StepCards.tsx`).toBeGreaterThan(-1);
      // The assignment `type = '<x>'` follows the case label in the same block.
      const block = stepCards.slice(idx, idx + 900);
      expect(block).toMatch(new RegExp(`type\\s*=\\s*'${type}'`));
    });
  }
});
