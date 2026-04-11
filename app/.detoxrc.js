/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/Nave.app',
      build: 'xcodebuild -workspace ios/Nave.xcworkspace -scheme Nave -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build | tee /tmp/xcodebuild_debug.log | tail -20',
    },
    'ios.release': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/Nave.app',
      build: 'xcodebuild -workspace ios/Nave.xcworkspace -scheme Nave -configuration Release -sdk iphonesimulator -derivedDataPath ios/build | tee /tmp/xcodebuild_release.log | tail -20',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 17 Pro',
      },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    'ios.sim.release': {
      device: 'simulator',
      app: 'ios.release',
    },
  },
};
