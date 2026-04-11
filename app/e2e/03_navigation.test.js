/**
 * Primary navigation tests.
 * Uses testIDs on tab buttons (tabBarTestID) to avoid ambiguity with header text.
 */

const { device, expect: detoxExpect, element, by, waitFor } = require('detox');
const { loadState } = require('./helpers/state');
const { loginUser, dismissPasswordDialog } = require('./helpers/loginUI');

describe('Primary navigation', () => {
  let state;

  beforeAll(async () => {
    state = loadState();
    if (!state) throw new Error('No seed state found.');
    await device.launchApp({ newInstance: true, delete: true });
    await loginUser(state.users[0], state.testPw);
  });

  beforeEach(async () => {
    // Full process kill+restart (no data delete): dismisses any native dialog,
    // token survives in AsyncStorage so the app lands on the main screen.
    await device.launchApp({ newInstance: true });
    await waitFor(element(by.id('tab-groups'))).toBeVisible().withTimeout(12000);
  });

  it('shows all four bottom tab buttons', async () => {
    await detoxExpect(element(by.id('tab-parish'))).toBeVisible();
    await detoxExpect(element(by.id('tab-groups'))).toBeVisible();
    await detoxExpect(element(by.id('tab-friends'))).toBeVisible();
    await detoxExpect(element(by.id('tab-profile'))).toBeVisible();
  });

  it('navigates to the Groups tab and shows the list', async () => {
    await element(by.id('tab-groups')).tap();
    await waitFor(element(by.id('groups-list'))).toBeVisible().withTimeout(8000);
  });

  it('navigates to the Friends tab', async () => {
    await element(by.id('tab-friends')).tap();
    // Friends screen shows some content — just check the tab is active
    await waitFor(element(by.id('tab-friends'))).toBeVisible().withTimeout(6000);
  });

  it('navigates to the Profile tab and shows the display name', async () => {
    await element(by.id('tab-profile')).tap();
    await waitFor(element(by.text('E2E User 1'))).toBeVisible().withTimeout(8000);
  });

  it('navigates to the Parish tab', async () => {
    await element(by.id('tab-parish')).tap();
    await waitFor(element(by.id('tab-parish'))).toBeVisible().withTimeout(6000);
  });

  it('switches between tabs multiple times', async () => {
    await element(by.id('tab-groups')).tap();
    await detoxExpect(element(by.id('groups-list'))).toBeVisible();
    await element(by.id('tab-profile')).tap();
    await detoxExpect(element(by.text('E2E User 1'))).toBeVisible();
    await element(by.id('tab-groups')).tap();
    await detoxExpect(element(by.id('groups-list'))).toBeVisible();
  });
});
