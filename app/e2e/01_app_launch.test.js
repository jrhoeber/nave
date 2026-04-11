/**
 * App launch and initial render tests.
 * Uses delete:true to clear stored auth so we always see the Welcome screen.
 */

const { device, expect: detoxExpect, element, by } = require('detox');

describe('App launch', () => {
  beforeAll(async () => {
    // Clear app data so we always start from Welcome screen
    await device.launchApp({ newInstance: true, delete: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('launches and shows the welcome screen CTA buttons', async () => {
    await detoxExpect(element(by.id('welcome-create-account-btn'))).toBeVisible();
    await detoxExpect(element(by.id('welcome-sign-in-btn'))).toBeVisible();
  });

  it('shows Create Account button', async () => {
    await detoxExpect(element(by.id('welcome-create-account-btn'))).toBeVisible();
  });

  it('shows Sign In button', async () => {
    await detoxExpect(element(by.id('welcome-sign-in-btn'))).toBeVisible();
  });

  it('shows the app name Nave', async () => {
    // Use atIndex(0) since "Nave" may appear in multiple text nodes
    await detoxExpect(element(by.text('Nave')).atIndex(0)).toBeVisible();
  });
});
