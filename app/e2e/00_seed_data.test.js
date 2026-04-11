/**
 * Data seeding spec — runs FIRST (alphabetically: 00_).
 *
 * Creates via the API (no UI):
 *   - 10 test users (password: test1234)
 *   - Assigns them evenly across 3 real parishes
 *   - Creates 10 prayer groups, each associated with the creator's parish
 *   - Users join only groups belonging to their own parish
 *   - Each user sends 20 messages in each of their parish's groups
 *   - Creates 10 empty (memberless) groups per parish (30 total)
 *   - Each user creates 10 parish posts in their assigned parish
 *
 * Parish → user → group assignment:
 *   Parish 0: users 0-2  → groups 0-2
 *   Parish 1: users 3-5  → groups 3-5
 *   Parish 2: users 6-9  → groups 6-9
 *
 * State is written to a temp JSON file so later specs can reference credentials.
 *
 * NOTE: Detox overrides the global `expect`. Plain throws are used for assertions.
 */

const { device } = require('detox');
const api = require('./helpers/api');
const { saveState } = require('./helpers/state');
const { randomMessage, randomCategory } = require('./helpers/random');

const E2E_TAG           = Math.random().toString(36).slice(2, 6); // 4-char unique run ID
const TEST_PW           = 'test1234';
const NUM_USERS         = 10;
const NUM_GROUPS        = 10;  // public groups (with members)
const NUM_EMPTY_GROUPS  = 10;  // empty groups per parish
const NUM_PRIVATE       = 2;   // private groups
const MSGS_PER_MEMBER   = 20;
const POSTS_PER_USER    = 10;  // parish posts per user

const PARISH_QUERIES = ['Saint Patrick', 'Holy Family', 'Saint Mary'];

/** Returns which of the 3 parishes (0-2) a user index belongs to. */
function parishIndexForUser(i) {
  if (i < 3) return 0;
  if (i < 6) return 1;
  return 2;
}

function assert(condition, msg) {
  if (!condition) throw new Error(`[Seed assertion] ${msg}`);
}

describe('Seed: Create test data via API', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('creates users, assigns parishes, creates groups, joins members, sends messages, creates empty groups and parish posts', async () => {
    // ── 1. Create 10 users ───────────────────────────────────────────────────
    console.log('[Seed] Creating 10 test users...');
    const users = [];
    for (let i = 1; i <= NUM_USERS; i++) {
      const body = {
        username:     `${E2E_TAG}u${i}`,
        display_name: `E2E User ${i}`,
        email:        `test${i}@test.com`,
        password:     TEST_PW,
      };
      const res = await api.signup(body);
      users.push({
        index:    i - 1,
        id:       res.user.id,
        token:    res.access_token,
        username: body.username,
        email:    body.email,
      });
    }
    assert(users.length === NUM_USERS, `Expected ${NUM_USERS} users, got ${users.length}`);
    console.log('[Seed] Created users:', users.map(u => u.username));

    // ── 2. Fetch 3 parishes ──────────────────────────────────────────────────
    console.log('[Seed] Fetching parishes...');
    const parishes = [];
    for (const q of PARISH_QUERIES) {
      try {
        const res = await api.searchParishes(q, users[0].token);
        const found = res.parishes?.[0];
        if (found) parishes.push({ id: found.id, name: found.name });
      } catch (e) {
        console.warn(`[Seed] Parish search "${q}" failed:`, e.message);
      }
    }
    const basePar = parishes[0] || { id: null, name: 'Unknown' };
    while (parishes.length < 3) parishes.push(basePar);
    console.log('[Seed] Parishes:', parishes.map(p => p.name));

    // ── 3. Assign parishes to users ──────────────────────────────────────────
    console.log('[Seed] Assigning parishes to users...');
    for (let i = 0; i < users.length; i++) {
      const parish = parishes[parishIndexForUser(i)];
      if (parish.id) {
        try {
          await api.updateMe({ parish_id: parish.id }, users[i].token);
          users[i].parishId   = parish.id;
          users[i].parishName = parish.name;
        } catch (e) {
          console.warn(`[Seed] Could not assign parish to user ${i + 1}:`, e.message);
        }
      }
    }

    // ── 4. Create 10 groups, each associated with the creator's parish ────────
    console.log('[Seed] Creating 10 prayer groups...');
    const groups = [];
    // groupsByParish[p] = groups belonging to parish index p
    const groupsByParish = [[], [], []];

    for (let i = 0; i < NUM_GROUPS; i++) {
      const user  = users[i];
      const pIdx  = parishIndexForUser(i);
      const parish = parishes[pIdx];
      const res = await api.createGroup({
        name:        `E2E Group ${i + 1} [${E2E_TAG}]`,
        description: `E2E test group ${i + 1}. Created by automated suite.`,
        category:    randomCategory(),
        is_private:  false,
        parish:      parish.name,   // associate with creator's parish
      }, user.token);
      const group = { id: res.id, name: res.name, adminIndex: i, parishIndex: pIdx };
      groups.push(group);
      groupsByParish[pIdx].push(group);
    }
    assert(groups.length === NUM_GROUPS, `Expected ${NUM_GROUPS} groups, got ${groups.length}`);
    console.log('[Seed] Created groups:', groups.map(g => g.name));

    // ── 5. Users join only groups belonging to their own parish ───────────────
    console.log('[Seed] Adding users to their parish groups...');
    for (let ui = 0; ui < users.length; ui++) {
      const pIdx = parishIndexForUser(ui);
      for (const group of groupsByParish[pIdx]) {
        if (ui === group.adminIndex) continue; // admin is already a member
        try {
          await api.joinGroup(group.id, users[ui].token);
        } catch (e) {
          if (!e.message.includes('409')) throw e;
        }
      }
    }

    // ── 6. Create 2 private groups and approve 5 members each ────────────────
    console.log('[Seed] Creating 2 private groups...');
    // Private group 1: admin = users[0], members = users[0..4]
    // Private group 2: admin = users[5], members = users[5..9]
    const privateGroups = [];
    const privateGroupDefs = [
      { adminIndex: 0, memberIndices: [1, 2, 3, 4] },
      { adminIndex: 5, memberIndices: [6, 7, 8, 9] },
    ];

    for (let p = 0; p < NUM_PRIVATE; p++) {
      const def   = privateGroupDefs[p];
      const admin = users[def.adminIndex];
      const pIdx  = parishIndexForUser(def.adminIndex);
      const res   = await api.createGroup({
        name:        `E2E Private ${p + 1} [${E2E_TAG}]`,
        description: `E2E private test group ${p + 1}.`,
        category:    randomCategory(),
        is_private:  true,
        parish:      parishes[pIdx].name,
      }, admin.token);
      const pg = { id: res.id, name: res.name, adminIndex: def.adminIndex, memberIndices: def.memberIndices, isPrivate: true };
      privateGroups.push(pg);

      // Each non-admin member requests to join, admin approves them
      for (const mi of def.memberIndices) {
        await api.joinGroup(pg.id, users[mi].token);        // → status: pending
        await api.approveUser(pg.id, users[mi].id, admin.token); // → status: member
      }
    }
    console.log('[Seed] Private groups:', privateGroups.map(g => g.name));

    // ── 7. Each user sends 20 messages in each of their groups ───────────────
    console.log('[Seed] Sending messages...');
    const messageLog = [];

    // Public parish groups
    for (let ui = 0; ui < users.length; ui++) {
      const pIdx = parishIndexForUser(ui);
      for (const group of groupsByParish[pIdx]) {
        for (let m = 0; m < MSGS_PER_MEMBER; m++) {
          try {
            const res = await api.sendMessage(group.id, randomMessage(), users[ui].token);
            if (res?.id) messageLog.push({ groupId: group.id, msgId: res.id });
          } catch (e) {
            console.warn(`[Seed] Message send failed: ${e.message}`);
          }
        }
      }
    }

    // Private groups
    for (const pg of privateGroups) {
      const allMembers = [users[pg.adminIndex], ...pg.memberIndices.map(mi => users[mi])];
      for (const user of allMembers) {
        for (let m = 0; m < MSGS_PER_MEMBER; m++) {
          try {
            const res = await api.sendMessage(pg.id, randomMessage(), user.token);
            if (res?.id) messageLog.push({ groupId: pg.id, msgId: res.id });
          } catch (e) {
            console.warn(`[Seed] Message send failed: ${e.message}`);
          }
        }
      }
    }

    console.log(`[Seed] Sent ${messageLog.length} messages.`);

    // ── 8. Create 10 empty groups per parish (no members beyond creator, who immediately leaves) ──
    console.log('[Seed] Creating empty groups per parish...');
    const emptyGroups = [[], [], []];
    for (let pIdx = 0; pIdx < 3; pIdx++) {
      // Use the first user of each parish as the creator; they will leave after creation
      const creatorIndex = pIdx === 0 ? 0 : pIdx === 1 ? 3 : 6;
      const creator = users[creatorIndex];
      const parish  = parishes[pIdx];
      for (let k = 0; k < NUM_EMPTY_GROUPS; k++) {
        try {
          const res = await api.createGroup({
            name:        `E2E Empty ${pIdx + 1}-${k + 1} [${E2E_TAG}]`,
            description: `Empty test group for parish ${pIdx + 1}.`,
            category:    randomCategory(),
            is_private:  false,
            parish:      parish.name,
          }, creator.token);
          emptyGroups[pIdx].push({ id: res.id, name: res.name, parishIndex: pIdx });
        } catch (e) {
          console.warn(`[Seed] Empty group creation failed: ${e.message}`);
        }
      }
    }
    console.log('[Seed] Empty groups created:', emptyGroups.map(pg => pg.length));

    // ── 9. Each user creates 10 parish posts in their parish ─────────────────
    console.log('[Seed] Creating parish posts...');
    const parishPosts = [];
    const POST_CONTENTS = [
      'Please pray for my family during this difficult time.',
      'Sharing a reflection from today\'s Gospel reading.',
      'Grateful for the blessings received this week.',
      'Asking for prayers for a sick friend.',
      'Reminder: adoration chapel open this Friday evening.',
      'Thank you to all who volunteered at the food pantry.',
      'Offering a prayer for all those suffering in our community.',
      'Blessed to be part of this parish family.',
      'Seeking prayers as I discern an important decision.',
      'In thanksgiving for prayers answered.',
    ];
    for (let ui = 0; ui < users.length; ui++) {
      const user   = users[ui];
      const parish = parishes[parishIndexForUser(ui)];
      if (!parish.id) continue;
      for (let p = 0; p < POSTS_PER_USER; p++) {
        try {
          const res = await api.createParishPost(parish.id, POST_CONTENTS[p % POST_CONTENTS.length], user.token);
          if (res?.id) parishPosts.push({ parishId: parish.id, postId: res.id, userIndex: ui });
        } catch (e) {
          console.warn(`[Seed] Parish post creation failed: ${e.message}`);
        }
      }
    }
    console.log(`[Seed] Created ${parishPosts.length} parish posts.`);

    // joinedGroups = public groups that users[0] (parish 0) is a member of
    const joinedGroups = groupsByParish[0];

    // ── 10. Persist state ────────────────────────────────────────────────────
    saveState({ users, parishes, groups, groupsByParish, emptyGroups, privateGroups, joinedGroups, messageLog, parishPosts, testPw: TEST_PW });
    console.log('[Seed] State saved. Seeding complete.');

    assert(groups.length === NUM_GROUPS, 'Public groups count mismatch');
    assert(privateGroups.length === NUM_PRIVATE, 'Private groups count mismatch');
    assert(messageLog.length > 0, 'No messages sent');
    assert(parishPosts.length > 0, 'No parish posts created');
  });
});
