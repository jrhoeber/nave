/**
 * Authentication flow tests.
 *
 * Each test uses a full app restart (launchApp delete:true) in beforeEach.
 * This guarantees: (a) Welcome screen is shown, (b) no stale auth token,
 * (c) no lingering native "Save Password?" sheet from a prior test.
 */

const { device, expect: detoxExpect, element, by, waitFor } = require('detox');
const { loadState } = require('./helpers/state');
const { dismissPasswordDialog } = require('./helpers/loginUI');

describe('Authentication', () => {
  let state;

  beforeAll(async () => {
    state = loadState();
    if (!state) throw new Error('No seed state found. Run 00_seed_data first.');
  });

  beforeEach(async () => {
    // Full restart + data wipe each time: no token, no native dialog carry-over
    await device.launchApp({ newInstance: true, delete: true });
    await waitFor(element(by.id('welcome-sign-in-btn'))).toBeVisible().withTimeout(8000);
  });

  // ── Navigate helpers ───────────────────────────────────────────────────────

  async function goToLogin() {
    await element(by.id('welcome-sign-in-btn')).tap();
    await waitFor(element(by.id('login-email-input'))).toBeVisible().withTimeout(5000);
  }

  async function goToSignUp() {
    await element(by.id('welcome-create-account-btn')).tap();
    await waitFor(element(by.id('signup-displayname-input'))).toBeVisible().withTimeout(5000);
  }

  // ── Login screen ──────────────────────────────────────────────────────────

  describe('Login screen', () => {
    it('tapping Sign In navigates to login screen', async () => {
      await element(by.id('welcome-sign-in-btn')).tap();
      await waitFor(element(by.id('login-email-input'))).toBeVisible().withTimeout(5000);
      await detoxExpect(element(by.id('login-email-input'))).toBeVisible();
      await detoxExpect(element(by.id('login-password-input'))).toBeVisible();
    });

    it('shows error when submitting empty form', async () => {
      await goToLogin();
      await element(by.id('login-submit-btn')).tap();
      await waitFor(element(by.id('login-error-banner'))).toBeVisible().withTimeout(4000);
    });

    it('shows error for invalid credentials', async () => {
      await goToLogin();
      await element(by.id('login-email-input')).typeText('nobody@invalid.nave');
      await element(by.id('login-password-input')).typeText('wrongpassword');
      await element(by.id('login-submit-btn')).tap();
      await waitFor(element(by.id('login-error-banner'))).toBeVisible().withTimeout(10000);
    });

    it('logs in successfully with seeded credentials', async () => {
      const user = state.users[0];
      await goToLogin();
      await element(by.id('login-email-input')).typeText(user.email);
      await element(by.id('login-password-input')).typeText(state.testPw);
      await element(by.id('login-submit-btn')).tap();
      await waitFor(element(by.id('tab-groups'))).toBeVisible().withTimeout(15000);
    });
  });

  // ── Sign Up ───────────────────────────────────────────────────────────────

  describe('Sign Up screen', () => {
    it('tapping Create Account navigates to sign up screen', async () => {
      await goToSignUp();
      await detoxExpect(element(by.id('signup-displayname-input'))).toBeVisible();
    });

    it('shows error when all fields are empty', async () => {
      await goToSignUp();
      await element(by.id('signup-submit-btn')).tap();
      await waitFor(element(by.id('signup-error-banner'))).toBeVisible().withTimeout(4000);
    });

    it('shows error when password is too short', async () => {
      await goToSignUp();
      await element(by.id('signup-displayname-input')).typeText('Test Person');
      await element(by.id('signup-username-input')).typeText(`tperson_${Date.now()}`);
      await element(by.id('signup-email-input')).typeText(`tperson_${Date.now()}@test.nave`);
      await element(by.id('signup-scroll')).scroll(150, 'down');
      await element(by.id('signup-password-input')).typeText('short');
      await element(by.id('signup-submit-btn')).tap();
      await waitFor(element(by.id('signup-error-banner'))).toBeVisible().withTimeout(4000);
    });

    it('creates a new account and enters the app', async () => {
      const ts = Date.now();
      await goToSignUp();
      await element(by.id('signup-displayname-input')).typeText('New E2E User');
      await element(by.id('signup-username-input')).typeText(`ne2e_${ts}`.slice(0, 40));
      await element(by.id('signup-email-input')).typeText(`ne2e_${ts}@test.nave`);
      await element(by.id('signup-scroll')).scroll(150, 'down');
      await element(by.id('signup-password-input')).typeText('test1234');
      await element(by.id('signup-submit-btn')).tap();
      await waitFor(element(by.id('tab-groups'))).toBeVisible().withTimeout(15000);
    });
  });

  // ── Logout ────────────────────────────────────────────────────────────────

  describe('Logout', () => {
    it('logs out and returns to welcome screen', async () => {
      const user = state.users[1];
      await goToLogin();
      await element(by.id('login-email-input')).typeText(user.email);
      await element(by.id('login-password-input')).typeText(state.testPw);
      await element(by.id('login-submit-btn')).tap();
      await waitFor(element(by.id('tab-groups'))).toBeVisible().withTimeout(15000);
      // Dismiss the "Save Password?" sheet before tapping the tab bar
      await dismissPasswordDialog();
      await waitFor(element(by.id('tab-groups'))).toBeVisible().withTimeout(8000);
      await element(by.id('tab-profile')).tap();
      await waitFor(element(by.id('profile-scroll'))).toBeVisible().withTimeout(6000);
      await element(by.id('profile-scroll')).scrollTo('bottom');
      await waitFor(element(by.id('profile-sign-out-btn'))).toBeVisible().withTimeout(6000);
      await element(by.id('profile-sign-out-btn')).tap();
      await waitFor(element(by.id('welcome-sign-in-btn'))).toBeVisible().withTimeout(8000);
    });
  });
});
