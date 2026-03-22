/**
 * Fix stale unique index on `userId` when the Wallet model uses `user`.
 * Also removes orphan wallets (user null) and duplicate wallets per user.
 *
 * Usage: node scripts/fix-wallets-user-index.js
 * Requires: MONGODB_URI in .env
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(uri, { autoIndex: false });
  const col = mongoose.connection.collection('wallets');

  const indexes = await col.indexes();
  console.log('Current indexes:', indexes.map((i) => i.name));

  // Drop wrong index if present
  const bad = indexes.find((i) => i.name === 'userId_1' || (i.key && i.key.userId !== undefined));
  if (bad) {
    console.log('Dropping wrong index:', bad.name);
    await col.dropIndex(bad.name);
  }

  // Drop failed/partial user_1 if we need to rebuild after cleanup
  const hasUserIdx = indexes.some((i) => i.name === 'user_1');
  if (hasUserIdx) {
    try {
      await col.dropIndex('user_1');
      console.log('Dropped existing user_1 to rebuild after cleanup.');
    } catch (_) {
      /* ignore */
    }
  }

  // Orphan wallets (no user) — block a proper unique index on `user`
  const orphanRes = await col.deleteMany({
    $or: [{ user: null }, { user: { $exists: false } }],
  });
  console.log(`Deleted orphan wallets (missing user): ${orphanRes.deletedCount}`);

  // Duplicate wallets for same user — keep oldest, remove rest
  const dupGroups = await col
    .aggregate([
      { $match: { user: { $ne: null } } },
      {
        $group: {
          _id: '$user',
          count: { $sum: 1 },
          docs: { $push: { id: '$_id', createdAt: '$createdAt' } },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  let dupRemoved = 0;
  for (const g of dupGroups) {
    const sorted = [...g.docs].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ta - tb;
    });
    const [, ...rest] = sorted;
    const idsToRemove = rest.map((d) => d.id);
    if (idsToRemove.length) {
      const r = await col.deleteMany({ _id: { $in: idsToRemove } });
      dupRemoved += r.deletedCount;
    }
  }
  console.log(`Removed duplicate wallet docs (kept oldest per user): ${dupRemoved}`);

  await col.createIndex({ user: 1 }, { unique: true, name: 'user_1' });
  console.log('Ensured unique index on { user: 1 }');

  console.log('Done.');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
