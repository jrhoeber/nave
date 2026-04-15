# Detox E2E Test Suite — Instructions for Claude Code
 
## Goal
 
Create a comprehensive suite of Detox end-to-end tests for this React Native iOS app. Run the tests locally to verify they pass. **Do not** add, modify, or run any GitHub Actions workflows for these tests.
 
## Setup
 
1. Check whether Detox is already installed. If not, install it:
   ```bash
   npm install --save-dev detox jest
   brew tap wix/brew
   brew install applesimutils
   npx detox init
   ```
 
2. Configure `.detoxrc.js` for an iOS simulator build (`ios.sim.debug` and `ios.sim.release`). Use a current iPhone simulator (e.g., iPhone 15) and point `binaryPath` at the app's Xcode build output.
 
3. Audit the app's source code to identify the main user flows worth covering. Add `testID` props to the relevant components so tests can locate elements reliably. Prefer `testID` over text-based matchers.
 
## Test Suite
 
Place tests in the `app/e2e/` directory. Create one spec file per flow. At minimum, cover:
 
- App launch and initial render
- Authentication (sign up, log in, log out, invalid credentials)
- create 10 test users with random names, emails, and user password: test1234
- assign them evenly to 3 random parishes
- create 10 test groups with random options selected
- Add the 10 users to 5 random groups
- Each user should send 20 random messages in the groups they were added to
- Primary navigation between main screens/tabs
- Core create/read/update/delete flows for the app's main data model
- Form validation and error states
- Any critical happy paths a user would hit in the first session
 
Each spec should use `beforeAll(() => device.launchApp())` and `beforeEach(() => device.reloadReactNative())` for isolation. Keep individual tests focused and independent — no shared state between tests.

After all the tests run, delete all test data that was generated.
 
## Running Locally
 
Build once, then run the suite:
 
```bash
detox build --configuration ios.sim.debug
detox test --configuration ios.sim.debug
```
 
Iterate until all tests pass cleanly. If a test is flaky, fix it — do not mark it as skipped or retry-until-green.
 
## Reporting
 
When finished, summarize:
- Which flows are covered
- Total number of tests and pass/fail status of the final local run
- Any `testID` props you added to app source
- Any flows you intentionally did not cover and why
 
## Out of Scope — Do NOT Do These
 
- **Do not** create `.github/workflows/*.yml` files for Detox
- **Do not** modify any existing GitHub Actions workflows to add Detox steps
- **Do not** add CI configuration for any other provider (CircleCI, Bitrise, etc.) unless explicitly asked
- **Do not** commit simulator artifacts, build outputs, or `derivedData` — make sure `.gitignore` covers them
 
If the user later asks for CI integration, stop and confirm before adding any workflow files.
 