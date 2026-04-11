/**
 * Teardown — runs LAST (alphabetically: 99_).
 *
 * Deletes all test data created by 00_seed_data:
 *   - All 10 prayer groups (admins delete their own group)
 *   - State file is cleared
 *
 * Note: The API does not expose a user-deletion endpoint, so seeded user
 * accounts remain in the database but are identifiable by their e2e_ prefix
 * and will not interfere with production data.
 */

const { device } = require('detox');
const api    = require('./helpers/api');
const { loadState, clearState } = require('./helpers/state');

describe('Teardown: Delete test data', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('deletes all seeded prayer groups', async () => {
    const state = loadState();
    if (!state) {
      console.warn('[Teardown] No state found — nothing to clean up.');
      return;
    }

    const { users, groups } = state;
    let deleted = 0;
    let failed  = 0;

    for (const group of groups) {
      const admin = users[group.adminIndex];
      if (!admin) continue;
      try {
        await api.deleteGroup(group.id, admin.token);
        deleted++;
      } catch (e) {
        console.warn(`[Teardown] Could not delete group ${group.id}: ${e.message}`);
        failed++;
      }
    }

    console.log(`[Teardown] Deleted ${deleted} groups, ${failed} failed.`);
    clearState();
    expect(deleted).toBeGreaterThan(0);
  });
});
