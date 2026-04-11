/**
 * Shared UI login helper for Detox tests.
 *
 * The iOS "Save Password?" sheet is a native extension sheet that persists
 * across reloadReactNative() and sendToHome()+launchApp(newInstance:false).
 * The only reliable dismissal is a full process kill via
 * launchApp({ newInstance: true }) WITHOUT delete:true — the app process is
 * torn down (taking the dialog with it) but AsyncStorage is preserved, so the
 * auth token survives and the app lands on the main screen.
 */

const { device, element, by, waitFor } = require('detox');

/**
 * Logs in via the UI starting from the Welcome screen.
 * After reaching the main screen, kills and restarts the app to dismiss any
 * "Save Password?" sheet, then waits for the main screen to reappear.
 */
async function loginUser(user, testPw) {
  await waitFor(element(by.id('welcome-sign-in-btn'))).toBeVisible().withTimeout(5000);
  await element(by.id('welcome-sign-in-btn')).tap();
  await waitFor(element(by.id('login-email-input'))).toBeVisible().withTimeout(5000);
  await element(by.id('login-email-input')).typeText(user.email);
  await element(by.id('login-password-input')).typeText(testPw);
  await element(by.id('login-submit-btn')).tap();

  // Wait for the app to fully land on the main screen first
  await waitFor(element(by.id('tab-groups'))).toBeVisible().withTimeout(15000);

  // Kill and restart to dismiss the "Save Password?" sheet.
  // newInstance:true (no delete) preserves AsyncStorage so the token survives.
  await dismissPasswordDialog();

  // Wait for the app to be ready after restart
  await waitFor(element(by.id('tab-groups'))).toBeVisible().withTimeout(10000);
}

/**
 * Kills the app and relaunches it without clearing data.
 * This tears down any native-level "Save Password?" sheet along with the process.
 * The auth token in AsyncStorage is preserved.
 */
async function dismissPasswordDialog() {
  await device.launchApp({ newInstance: true });
}

module.exports = { loginUser, dismissPasswordDialog };
