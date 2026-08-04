
const COMMANDS = [
  'mcode init my-api --template fastify',
  'mcode run dev',
  'mcode test --changed',
  'mcode god "build a full-stack todo app"',
  'mcode watch',
  'mcode ship --env prod',
  'mcode model set backend deepseek:deepseek-chat',
  'mcode add plugin:eslint',
  'mcode god "fix my auth bug" --model openrouter:claude-3.5-sonnet',
  'mcode doctor'
];

export function CommandMarquee() {
  const doubled = [...COMMANDS, ...COMMANDS];
  return (
    <div className="relative overflow-hidden border-y border-mcode-border bg-mcode-panel/40 py-3">
      <div className="flex w-max animate-marquee gap-8 whitespace-nowrap">
        {doubled.map((cmd, i) => (
          <span key={i} className="font-mono text-sm text-gray-500">
            <span className="text-mcode-green">$</span> {cmd}
          </span>
        ))}
      </div>
    </div>
  );
}
