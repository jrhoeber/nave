/**
 * Custom Detox global setup.
 * Wraps Detox's own globalSetup, then disables iOS AutoFill Passwords on the
 * booted simulator so the "Save Password?" sheet never interrupts tests.
 */

const detoxGlobalSetup = require('detox/runners/jest/globalSetup');
const { execSync } = require('child_process');

module.exports = async function globalSetup(globalConfig) {
  // Let Detox boot the simulator first
  await detoxGlobalSetup(globalConfig);

  // Disable AutoFill Passwords so iOS never shows the "Save Password?" prompt
  try {
    execSync(
      'xcrun simctl spawn booted defaults write com.apple.PasswordManager AutoFillPasswords -bool NO',
      { stdio: 'pipe' }
    );
    console.log('[globalSetup] AutoFill Passwords disabled on simulator.');
  } catch (e) {
    console.warn('[globalSetup] Could not disable AutoFill Passwords:', e.message);
  }
};
