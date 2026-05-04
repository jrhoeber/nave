const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('@react-native/metro-config');

const config = {
  server: {
    // Increase the idle websocket timeout to prevent disconnects during
    // heavy bundle rebuilds or when the simulator is briefly unresponsive.
    messageSocketTimeout: 180000, // 3 minutes (default is 60s)
  },
  transformer: {
    // Defer module evaluation until first use — meaningful cold-start win
    // because screens, navigators, and stores aren't all evaluated up-front.
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
