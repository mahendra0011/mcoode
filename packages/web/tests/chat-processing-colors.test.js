/**
 * Live-processing colour contract (spec §3).
 *
 * The chat “processing” surface — spinner, pulse dot, brain icon, tool-call
 * running state — must use the single emerald token (`--mcode-green` /
 * `text-emerald-400`). Blue/purple/cyan/amber are reserved for non-agent UI
 * (links, badges, warnings, errors), and must not leak into this path.
 *
 * Scanned: the components that ARE the live path.
 * Excluded on purpose:
 *   • SpinnerBlock.tsx — parameterised; only its DEFAULT (`emerald`) is pinned.
 *   • CleanupReport.tsx — a report of dead-code categories, not agent state;
 *     its category colours are documented in docs/web-audit (WEB-036).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const chatDir = join(here, '..', 'src', 'components', 'chat');

const OFF_SPEC = /(?:text|bg|border)-(?:blue|purple|cyan|violet|pink|amber|orange|indigo|sky|fuchsia)-[0-9]{3}/;

function read(name) {
  return readFileSync(join(chatDir, name), 'utf8');
}

describe('live-processing components stay on the emerald token (spec §3)', () => {
  const livePathFiles = [
    'AgentActionSequence.tsx',
    'ThoughtBlock.tsx',
    'WorkingHeader.tsx',
    'VirtualChatMessages.tsx',
  ];

  for (const file of livePathFiles) {
    it(`${file} uses no off-spec accent colours`, () => {
      const offenders = read(file)
        .split(/\r?\n/)
        .map((line, i) => ({ line: line.trim(), no: i + 1 }))
        .filter(({ line }) => OFF_SPEC.test(line) && !line.startsWith('*') && !line.startsWith('//'));
      expect(
        offenders,
        `${file} renders live agent state with off-spec colours:\n` +
          offenders.map((o) => `  ${file}:${o.no}  ${o.line}`).join('\n')
      ).toEqual([]);
    });
  }

  it('AgentActionSequence uses the mcode green token for the brain icon', () => {
    expect(read('AgentActionSequence.tsx')).toContain('var(--mcode-green');
  });

  it('StepPulse keeps the spec pulse timing (1.1s ease-in-out infinite)', () => {
    const ux = read('mcodeUX.tsx');
    expect(ux).toMatch(/duration:\s*1\.1/);
    expect(ux).toMatch(/repeat:\s*Infinity/);
    expect(ux).toMatch(/easeInOut|ease-in-out/);
  });

  it('SpinnerBlock defaults to emerald and keeps the 5-frame / 80ms spec', () => {
    const spinner = read('SpinnerBlock.tsx');
    expect(spinner).toContain("const SPIN_FRAMES = ['●', '◐', '◓', '◑', '◒']");
    expect(spinner).toMatch(/\},\s*80\);/); // setInterval(..., 80)
    expect(spinner).toMatch(/color = 'emerald'/);
  });

  it('the streaming cursor blinks emerald at the spec 0.9s cadence', () => {
    const chatMessage = read('ChatMessage.tsx');
    expect(chatMessage).toContain('var(--mcode-green');
    expect(chatMessage).toMatch(/duration:\s*0\.9/);
  });
});
