/**
 * Shared test state – written to disk so it survives across Jest worker boundaries.
 * Uses a temp file keyed by the test run start time.
 */

const fs   = require('fs');
const path = require('path');

const STATE_FILE = path.join(require('os').tmpdir(), 'nave_e2e_state.json');

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function loadState() {
  if (!fs.existsSync(STATE_FILE)) return null;
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

function clearState() {
  if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE);
}

module.exports = { saveState, loadState, clearState };
