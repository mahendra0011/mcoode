import { describe, it, expect, beforeEach } from 'vitest';
import { connectDb, db } from '../src/db.js';

describe('memory storage adapter', () => {
  beforeEach(async () => {
    await connectDb(null);
  });

  it('reports memory mode when no URI is given', async () => {
    const conn = await connectDb(null);
    expect(conn.mode).toBe('memory');
    expect(conn.connected).toBe(false);
  });

  it('CRUD round-trip', async () => {
    const d = db();
    expect(d.mode).toBe('memory');

    const user = await d.user.create({ email: 'a@b.dev', passwordHash: 'x', name: 'A' });
    expect(user._id).toBeDefined();

    const byId = await d.user.findById(user._id);
    expect(byId.email).toBe('a@b.dev');

    const updated = await d.user.findByIdAndUpdate(user._id, { name: 'B' });
    expect(updated.name).toBe('B');

    const found = await d.user.findOne({ email: 'a@b.dev' });
    expect(found.name).toBe('B');

    const del = await d.user.deleteOne({ email: 'a@b.dev' });
    expect(del.deletedCount).toBe(1);
    expect(await d.user.countDocuments()).toBe(0);
  });

  it('supports $in, $gte, $lte and sorting', async () => {
    const d = db();
    const t0 = Date.now();
    await d.session.create({ mode: 'god', status: 'done', costUsd: 1, createdAt: new Date(t0) });
    await d.session.create({ mode: 'chat', status: 'done', costUsd: 3, createdAt: new Date(t0 + 2000) });
    await d.session.create({ mode: 'chat', status: 'failed', costUsd: 2, createdAt: new Date(t0 + 4000) });

    const inList = await d.session.find({ mode: { $in: ['god', 'chat'] } });
    expect(inList).toHaveLength(3);

    const range = await d.session.find({ costUsd: { $gte: 2, $lte: 3 } });
    expect(range).toHaveLength(2);

    const sorted = await d.session.find({}, { createdAt: -1 });
    expect(sorted[0].costUsd).toBe(2);
    expect(sorted[2].costUsd).toBe(1);
  });

  it('is isolated per model name', async () => {
    const d = db();
    await d.plugin.create({ name: 'plugin:eslint' });
    expect(await d.user.countDocuments()).toBe(0);
    expect(await d.plugin.countDocuments()).toBe(1);
  });
});
