/**
 * Profile screen tests.
 * Logged in once in beforeAll, token persists across reloads.
 */

const { device, expect: detoxExpect, element, by, waitFor } = require('detox');
const { loadState } = require('./helpers/state');
const { loginUser, dismissPasswordDialog } = require('./helpers/loginUI');

describe('Profile screen', () => {
  let state;

  beforeAll(async () => {
    state = loadState();
    if (!state) throw new Error('No seed state found.');
    await device.launchApp({ newInstance: true, delete: true });
    // Log in as user 3 (index 2)
    await loginUser(state.users[2], state.testPw);
  });

  beforeEach(async () => {
    // Full process kill+restart (no data delete): dismisses any native dialog,
    // token survives in AsyncStorage so the app lands on the main screen.
    await device.launchApp({ newInstance: true });
    await waitFor(element(by.id('tab-groups'))).toBeVisible().withTimeout(12000);
    await element(by.id('tab-profile')).tap();
    await waitFor(element(by.id('profile-scroll'))).toBeVisible().withTimeout(8000);
    await element(by.id('profile-scroll')).scrollTo('bottom');
    await waitFor(element(by.id('profile-sign-out-btn'))).toBeVisible().withTimeout(6000);
  });

  it('shows the user display name on the profile card', async () => {
    await detoxExpect(element(by.text('E2E User 3'))).toBeVisible();
  });

  it('shows the username with @ prefix', async () => {
    await detoxExpect(element(by.text(`@${state.users[2].username}`))).toBeVisible();
  });

  it('shows Friends, Groups, and Posts stats', async () => {
    await detoxExpect(element(by.text('Friends'))).toBeVisible();
    await detoxExpect(element(by.text('Groups'))).toBeVisible();
    await detoxExpect(element(by.text('Posts'))).toBeVisible();
  });

  it('shows the Edit Profile button', async () => {
    await detoxExpect(element(by.text('Edit Profile'))).toBeVisible();
  });

  it('shows the Sign Out button', async () => {
    await detoxExpect(element(by.id('profile-sign-out-btn'))).toBeVisible();
  });

  it('shows Account menu items', async () => {
    await detoxExpect(element(by.text('Notifications'))).toBeVisible();
    await detoxExpect(element(by.text('Help & Support'))).toBeVisible();
  });
});
