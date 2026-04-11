/**
 * Prayer group flows.
 * Logged in once in beforeAll, token persists across reloads.
 */

const { device, expect: detoxExpect, element, by, waitFor } = require('detox');
const { loadState } = require('./helpers/state');
const { loginUser, dismissPasswordDialog } = require('./helpers/loginUI');

async function goToGroupsTab() {
  await element(by.id('tab-groups')).tap();
  await waitFor(element(by.id('groups-list'))).toBeVisible().withTimeout(8000);
}

describe('Prayer groups', () => {
  let state;
  let firstJoinedGroup;

  beforeAll(async () => {
    state = loadState();
    if (!state) throw new Error('No seed state found.');
    firstJoinedGroup = state.joinedGroups[0];
    await device.launchApp({ newInstance: true, delete: true });
    await loginUser(state.users[0], state.testPw);
  });

  beforeEach(async () => {
    // Full process kill+restart (no data delete): dismisses any native dialog,
    // token survives in AsyncStorage so the app lands on the main screen.
    await device.launchApp({ newInstance: true });
    await waitFor(element(by.id('tab-groups'))).toBeVisible().withTimeout(12000);
    await goToGroupsTab();
  });

  it('shows seeded prayer groups in the list', async () => {
    await detoxExpect(element(by.id('groups-list'))).toBeVisible();
  });

  it('opens a group card and shows the chat/detail screen', async () => {
    await waitFor(element(by.id(`group-card-${firstJoinedGroup.id}`))).toBeVisible().withTimeout(8000);
    await element(by.id(`group-card-${firstJoinedGroup.id}`)).tap();
    await waitFor(element(by.text(firstJoinedGroup.name))).toBeVisible().withTimeout(8000);
  });

  it('shows the message input for a group the user belongs to', async () => {
    await waitFor(element(by.id(`group-card-${firstJoinedGroup.id}`))).toBeVisible().withTimeout(8000);
    await element(by.id(`group-card-${firstJoinedGroup.id}`)).tap();
    await waitFor(element(by.id('group-message-input'))).toBeVisible().withTimeout(10000);
  });

  it('can send a message in a joined group', async () => {
    await waitFor(element(by.id(`group-card-${firstJoinedGroup.id}`))).toBeVisible().withTimeout(8000);
    await element(by.id(`group-card-${firstJoinedGroup.id}`)).tap();
    await waitFor(element(by.id('group-message-input'))).toBeVisible().withTimeout(10000);
    const msg = 'Detox E2E test message';
    await element(by.id('group-message-input')).typeText(msg);
    await waitFor(element(by.id('group-send-btn'))).toBeVisible().withTimeout(4000);
    await element(by.id('group-send-btn')).tap();
    await waitFor(element(by.text(msg))).toBeVisible().withTimeout(10000);
  });

  it('navigates back from group detail to group list', async () => {
    await waitFor(element(by.id(`group-card-${firstJoinedGroup.id}`))).toBeVisible().withTimeout(8000);
    await element(by.id(`group-card-${firstJoinedGroup.id}`)).tap();
    await waitFor(element(by.text(firstJoinedGroup.name))).toBeVisible().withTimeout(8000);
    await element(by.label('Back')).tap();
    await waitFor(element(by.id('groups-list'))).toBeVisible().withTimeout(6000);
  });

  describe('Create new prayer group', () => {
    it('opens the Add Group modal via the + button', async () => {
      await element(by.id('groups-add-btn')).tap();
      await waitFor(element(by.text('Create New Group'))).toBeVisible().withTimeout(5000);
    });

    it('opens the Create Prayer Group screen from the modal', async () => {
      await element(by.id('groups-add-btn')).tap();
      await waitFor(element(by.text('Create New Group'))).toBeVisible().withTimeout(5000);
      await element(by.text('Create New Group')).tap();
      await waitFor(element(by.id('create-group-name-input'))).toBeVisible().withTimeout(6000);
    });

    it('creates a new prayer group with valid inputs', async () => {
      const ts = Date.now();
      await element(by.id('groups-add-btn')).tap();
      await waitFor(element(by.text('Create New Group'))).toBeVisible().withTimeout(5000);
      await element(by.text('Create New Group')).tap();
      await waitFor(element(by.id('create-group-name-input'))).toBeVisible().withTimeout(6000);
      await element(by.id('create-group-name-input')).typeText(`UI Group ${ts}`);
      await element(by.id('create-group-description-input')).typeText('Detox E2E created group.');
      await element(by.id('create-group-submit-btn')).tap();
      // Returns to groups list
      await waitFor(element(by.id('groups-list'))).toBeVisible().withTimeout(12000);
    });
  });
});
