/**
 * Custom jest test sequencer that sorts test files alphabetically.
 * This ensures 00_seed_data runs before 01_app_launch, etc., regardless
 * of which tests failed or passed in a previous run.
 */

const Sequencer = require('@jest/test-sequencer').default;

class AlphabeticalSequencer extends Sequencer {
  sort(tests) {
    return [...tests].sort((a, b) => {
      if (a.path < b.path) return -1;
      if (a.path > b.path) return 1;
      return 0;
    });
  }
}

module.exports = AlphabeticalSequencer;
