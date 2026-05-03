const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const config = {
  server: {
    // Increase the idle websocket timeout to prevent disconnects during
    // heavy bundle rebuilds or when the simulator is briefly unresponsive.
    messageSocketTimeout: 180000, // 3 minutes (default is 60s)
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
