import { db, connectDb } from '../src/db.js';
import { PLUGIN_REGISTRY } from '@mcode/shared';

async function main() {
  const { mode } = await connectDb();
  let inserted = 0;
  for (const [name, p] of Object.entries(PLUGIN_REGISTRY)) {
    const existing = await db().plugin.findOne({ name });
    if (existing) continue;
    await db().plugin.create({ name, category: p.category, description: p.desc, installs: 0 });
    inserted++;
  }
  console.log(`seeded ${inserted}/${Object.keys(PLUGIN_REGISTRY).length} plugins (db: ${mode})`);
  process.exit(0);
}

main().catch((err) => {
  console.error('seed failed:', err);
  process.exit(1);
});