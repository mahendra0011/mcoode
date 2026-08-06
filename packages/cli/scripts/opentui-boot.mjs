import { createCliRenderer, Text } from '@opentui/core';

try {
  const renderer = await createCliRenderer();
  renderer.root.add(Text({ content: 'Hello from OpenTUI' }));
  renderer.setBackgroundColor('#0a0a0a');
  console.error('BOOT_OK dims=' + renderer.width + 'x' + renderer.height);
  setTimeout(() => {
    try {
      renderer.clear();
    } catch {}
    renderer.destroy();
    process.exit(0);
  }, 400);
} catch (e) {
  console.error('BOOT_FAIL ' + (e && e.stack ? e.stack : e));
  process.exit(1);
}