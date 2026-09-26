// Runnable dev-data seeder (BUG-54): `node scripts/seed-dev-data.mjs`
// Generates 20 todos + 20 subscribers matching the existing schemas.
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pad = (n, w = 3) => String(n).padStart(w, '0');
const priorities = ['high', 'medium', 'low'];
const statuses = ['pending', 'in-progress', 'completed'];

await mkdir(join(root, 'todos'), { recursive: true });
await mkdir(join(root, 'subscribers'), { recursive: true });

for (let i = 1; i <= 20; i++) {
  const todo = {
    id: `todo-${pad(i)}`,
    title: `Dev task ${pad(i)}`,
    description: `Seeded development task number ${i}`,
    priority: priorities[i % 3],
    status: statuses[i % 3],
    created_at: new Date(Date.now() - i * 86400000).toISOString(),
    due_date: new Date(Date.now() + (20 - i) * 86400000).toISOString(),
  };
  await writeFile(join(root, 'todos', `todo-${pad(i, 2)}.json`), JSON.stringify(todo, null, 2) + '\n', 'utf8');
}

for (let i = 1; i <= 20; i++) {
  const sub = {
    id: `sub-${pad(i)}`,
    name: `User ${pad(i)}`,
    email: `user${pad(i)}@example.com`,
    status: i % 5 === 0 ? 'inactive' : 'active',
    created_at: new Date(Date.now() - i * 86400000).toISOString(),
    preferences: { notifications: i % 2 === 0, theme: i % 2 === 0 ? 'dark' : 'light' },
  };
  await writeFile(join(root, 'subscribers', `subscriber-${pad(i, 2)}.json`), JSON.stringify(sub, null, 2) + '\n', 'utf8');
}

console.log('seeded 20 todos + 20 subscribers');
